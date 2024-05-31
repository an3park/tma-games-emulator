import { useEffect, useState } from 'react'

export const useIP = () => {
  const [ip, setIp] = useState<string>()

  useEffect(() => {
    fetch('https://api.myip.com')
      .then((res) => res.json())
      .then((data) => setIp(Object.values(data.ip).join()))
  }, [])

  return ip
}
