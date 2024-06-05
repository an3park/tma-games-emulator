import { useEffect, useState } from 'preact/hooks'

export const useIP = () => {
  const [ip, setIp] = useState<string>()

  useEffect(() => {
    fetch('https://ifconfig.me/ip')
      .then((res) => res.text())
      .then(setIp)
  }, [])

  return ip
}
