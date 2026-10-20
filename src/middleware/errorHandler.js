export function errorHandler(error, _req, res, next) {
  if (!error) return next()
  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Upload is too large' })
    return
  }
  console.error(error)
  res.status(500).json({ error: 'Server error' })
}
