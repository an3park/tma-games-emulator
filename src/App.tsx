import { useEffect, useState } from 'preact/hooks'
import type { Api } from 'telegram'
import { useIP } from './useIP'
import { sleep } from 'telegram/Helpers'

const API_ID = 25958552
const API_HASH = '6234132845d2679247afa10e8b1f079e'

declare global {
  interface Window {
    telegram: typeof import('telegram')
  }
}

// from web https://app.hamsterkombat.io/clicker/?tgWebAppStartParam=kentId578972208#tgWebAppData=user%3D%257B%2522id%2522%253A323875116%252C%2522first_name%2522%253A%2522Andrey%2522%252C%2522last_name%2522%253A%2522P%2522%252C%2522username%2522%253A%2522an3park%2522%252C%2522language_code%2522%253A%2522en%2522%252C%2522allows_write_to_pm%2522%253Atrue%257D%26chat_instance%3D-8887301219653098554%26chat_type%3Dprivate%26start_param%3DkentId578972208%26auth_date%3D1717754400%26hash%3Da01264318405ba2d407f84d79c05aed960a71b45c214c9efc62b483200463386&tgWebAppVersion=7.2&tgWebAppPlatform=weba

interface IInitialState {
  phoneNumber: string
  password: string
  phoneCode: string
  sms: boolean
}

const themeParams =
  '&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22secondary_bg_color%22%3A%22%23181818%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%238774e1%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23ff595a%22%7D'

const sessionFromHash = location.hash.length > 10 ? location.hash.slice(1) : null

const localStorageSession = sessionFromHash || localStorage.getItem('session')

const SESSION = new window.telegram.sessions.StringSession(localStorageSession || '') // Get session from local storage

const client = new window.telegram.TelegramClient(SESSION, API_ID, API_HASH, {
  connectionRetries: 5,
}) // Immediately create a client using your application data

const connected = client.connect()

const initialState: IInitialState = {
  phoneNumber: '',
  password: '',
  phoneCode: '',
  sms: false,
} // Initialize component initial state

async function findCode() {
  for await (const iterator of client.iterDialogs({ archived: false })) {
    if (iterator.title === 'Telegram') {
      console.log((~~(Date.now() / 1000) - iterator.date) / 60, 'minutes ago')
      console.log(iterator.message?.message)
    }
  }
}

async function getHam() {
  let inputEntity: Api.TypeInputPeer | null = null

  for await (const iterator of client.iterDialogs({ archived: false })) {
    if (iterator.entity?.id.toJSNumber() === 7018368922) {
      inputEntity = iterator.inputEntity
      break
    }
  }

  if (!inputEntity) {
    await client.invoke(
      new window.telegram.Api.channels.JoinChannel({
        channel: 'hamster_kombat',
      })
    )

    await sleep(5000)

    const { inputChat } = await client.sendMessage('@hamster_kombat_bot', {
      message: '/start',
    })

    if (inputChat) {
      inputEntity = await client.getInputEntity(inputChat)
    }

    if (!inputEntity) {
      console.error('No inputEntity found')
      return
    }
  }

  const referal = (document.getElementById('referal') as HTMLInputElement)?.value

  const req = new window.telegram.Api.messages.RequestAppWebView({
    peer: inputEntity,
    startParam: referal ? `kentId${referal}` : undefined,
    platform: 'android',
    app: new window.telegram.Api.InputBotAppShortName({
      botId: inputEntity as any,
      shortName: 'start',
    }),
  })

  const res = await client.invoke(req)

  return res.url + themeParams
}

let messagesEnabled = false

const handleMessage = (message: Api.Message) => {
  console.log(message.message)
}

export default function App() {
  const [{ phoneNumber, password, phoneCode, sms }, setAuthInfo] =
    useState<IInitialState>(initialState)

  const [me, setMe] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (localStorageSession) {
        await connected

        const me = await client.getMe()

        document.title = `${me.firstName || ''} ${me.lastName || ''} ${me.username || ''}`

        setMe(`${me.firstName} ${me.lastName} ${me.username} ${me.id} ${me.phone}`)
      }
    }
    init()
  }, [])

  async function sendCodeHandler() {
    console.log('sendCodeHandler')
    try {
      await connected
      const codeRes = await client.sendCode(
        {
          apiId: API_ID,
          apiHash: API_HASH,
        },
        phoneNumber,
        sms
      )
      console.log(codeRes)
    } catch (error: any) {
      setError(error.message || String(error))
    }
  }

  async function clientStartHandler() {
    console.log('clientStartHandler')
    try {
      await client.start({
        phoneNumber,
        password: async () => password,
        phoneCode: async () => phoneCode,
        onError: (e) => {
          setError(e.message || String(e))
          console.error(e)
        },
      })
      const saved = client.session.save()
      localStorage.setItem('session', saved as any)

      location.reload()
    } catch (error: any) {
      setError(error.message || String(error))
    }
  }

  function inputChangeHandler({ target: { name, value } }: any) {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  function chackboxChangeHandler({ target: { name, checked } }: any) {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: checked }))
  }

  const ip = useIP()

  if (url) {
    return <iframe style={{ width: '393px', height: '728px', alignSelf: 'flex-start' }} src={url} />
  }

  if (localStorageSession) {
    return (
      <>
        <div>loaded from {location.hash ? 'hash' : 'localStorage'}</div>
        <div>{ip}</div>
        <div>{me}</div>

        <input type="text" id="referal" placeholder="referal id" />

        <button
          id="hamster"
          onClick={() => {
            getHam()
              .then((url) => {
                if (url) {
                  console.log(url)
                  setUrl(url)
                }
              })
              .catch((err) => {
                setError(err.message || String(err))
              })
          }}
        >
          Hamster
        </button>

        <hr style={{ width: '100%' }} />

        <button
          onClick={() => {
            const sessionHash = localStorage.getItem('session')
            if (sessionHash) {
              navigator.clipboard.writeText(sessionHash)
            }
          }}
        >
          copy session
        </button>

        <button
          onClick={() => {
            if (!messagesEnabled) {
              messagesEnabled = true
              client.addEventHandler((e) => {
                handleMessage(e.message)
              }, new window.telegram.TelegramClient.events.NewMessage({ outgoing: false }))
            }
          }}
        >
          messages to console
        </button>

        <button onClick={findCode}>find code</button>

        <ResetButton />
        <div style={{ color: 'red' }}>{error}</div>
      </>
    )
  }

  return (
    <>
      <div>{ip}</div>

      <input
        type="text"
        name="phoneNumber"
        placeholder="phone +7999"
        value={phoneNumber}
        onChange={inputChangeHandler}
      />
      <div style={{ display: 'flex' }}>
        force sms:
        <input
          type="checkbox"
          placeholder="sms"
          name="sms"
          checked={sms}
          onChange={chackboxChangeHandler}
        />
      </div>

      <button onClick={sendCodeHandler}>get code</button>

      <input
        type="text"
        name="password"
        placeholder="cloud pass"
        value={password}
        onChange={inputChangeHandler}
      />

      <input
        type="text"
        name="phoneCode"
        placeholder="code"
        value={phoneCode}
        onChange={inputChangeHandler}
      />

      <button onClick={clientStartHandler}>login</button>

      <hr style={{ width: '100%' }} />

      <input type="text" id="session_hash" placeholder="session hash" />

      <button
        onClick={() => {
          const sessionHash = (document.getElementById('session_hash') as HTMLInputElement)?.value
          if (sessionHash) {
            localStorage.setItem('session', sessionHash)
            location.reload()
          }
        }}
      >
        use session
      </button>

      <hr style={{ width: '100%' }} />

      <ResetButton />

      <div style={{ color: 'red' }}>{error}</div>
    </>
  )
}

function ResetButton() {
  return (
    <button
      onClick={() => {
        localStorage.clear()
        window.location.reload()
      }}
    >
      reset
    </button>
  )
}
