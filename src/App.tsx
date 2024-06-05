import { useEffect, useState } from 'preact/hooks'
import { EntityLike } from 'telegram/define'
import { useIP } from './useIP'

const API_ID = 25958552
const API_HASH = '6234132845d2679247afa10e8b1f079e'

declare global {
  interface Window {
    telegram: typeof import('telegram')
  }
}

interface IInitialState {
  phoneNumber: string
  password: string
  phoneCode: string
}

const themeParams =
  '&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22secondary_bg_color%22%3A%22%23181818%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%238774e1%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23ff595a%22%7D'

const localStorageSession = localStorage.getItem('session')

const SESSION = new window.telegram.sessions.StringSession(localStorageSession || '') // Get session from local storage

const client = new window.telegram.TelegramClient(SESSION, API_ID, API_HASH, {
  connectionRetries: 5,
}) // Immediately create a client using your application data

let connected: Promise<any>
if (localStorageSession) {
  connected = client.connect()
}

const initialState: IInitialState = { phoneNumber: '', password: '', phoneCode: '' } // Initialize component initial state

async function getHam() {
  let hamster_id: EntityLike | null = null
  let hamster_peer: EntityLike | null = null

  for await (const iterator of client.iterDialogs({ archived: false })) {
    if (iterator.entity?.id.toJSNumber() === 7018368922) {
      hamster_id = iterator.entity
      hamster_peer = iterator.dialog.peer
      break
    }
  }

  if (!hamster_id) {
    console.error('No bot found')
    return
  }

  if (!hamster_peer) {
    console.error('No peer found')
    return
  }

  const req = new window.telegram.Api.messages.RequestWebView({
    peer: hamster_peer,
    bot: 'hamster_kombat_bot',
    fromBotMenu: true,
    url: 'https://hamsterkombat.io/clicker',
    // startParam: 'HHHHH',
    // themeParams: new Api.DataJSON({
    //   data: 'thhh',
    // }),
    platform: 'android',
  })

  const res = await client.invoke(req)

  return res.url + themeParams
}

export default function App() {
  const [{ phoneNumber, password, phoneCode }, setAuthInfo] = useState<IInitialState>(initialState)

  const [me, setMe] = useState('')

  const [error, setError] = useState<string | null>(null)

  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (localStorageSession) {
        await connected

        const me = await client.getMe()

        setMe(`${me.firstName} ${me.lastName} ${me.username}`)
      }
    }
    init()
  }, [])

  async function sendCodeHandler(): Promise<void> {
    try {
      await client.connect() // Connecting to the server
      await client.sendCode(
        {
          apiId: API_ID,
          apiHash: API_HASH,
        },
        phoneNumber
      )
    } catch (error: any) {
      setError(error.message || String(error))
    }
  }

  async function clientStartHandler(): Promise<void> {
    try {
      await client.start({
        phoneNumber,
        password: async () => password,
        phoneCode: async () => phoneCode,
        onError: () => {},
      })
      const saved = client.session.save()
      localStorage.setItem('session', saved as any) // Save session to local storage

      location.reload()
    } catch (error: any) {
      setError(error.message || String(error))
    }
  }

  function inputChangeHandler({ target: { name, value } }: any): void {
    setAuthInfo((authInfo) => ({ ...authInfo, [name]: value }))
  }

  const ip = useIP()

  if (url) {
    return <iframe style={{ width: '393px', height: '728px' }} src={url} />
  }

  if (localStorageSession) {
    return (
      <>
        <div>{ip}</div>
        <div>{me}</div>
        <button
          id="hamster"
          onClick={() => {
            getHam()
              .then((url) => {
                if (url) {
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
