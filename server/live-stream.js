const clients = new Set()

function writeEvent(res, eventName, data) {
  res.write(`event: ${eventName}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function subscribe(req, res) {
  clients.add(res)

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 25000)

  writeEvent(res, 'ready', {
    status: 'success',
    connected: true,
  })

  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(res)
  })
}

function publish(eventName, data) {
  for (const res of clients) {
    try {
      writeEvent(res, eventName, data)
    } catch {
      clients.delete(res)
    }
  }
}

module.exports = {
  publish,
  subscribe,
}
