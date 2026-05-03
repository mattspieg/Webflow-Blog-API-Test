const http = require("node:http")
const fs = require("node:fs")
const path = require("node:path")
const { URL } = require("node:url")

const PORT = Number(process.env.PORT || 8000)
const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN
const BLOG_COLLECTION_ID =
  process.env.WEBFLOW_BLOG_COLLECTION_ID || "68c2f83a5e5b58838458e197"

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  })
  res.end(JSON.stringify(data, null, 2))
}

async function handleBlogRequest(req, res, requestUrl) {
  const token = req.headers["x-webflow-token"] || WEBFLOW_TOKEN
  const collectionId =
    requestUrl.searchParams.get("collectionId") || BLOG_COLLECTION_ID
  const params = new URLSearchParams({
    limit: requestUrl.searchParams.get("limit") || "20",
    offset: requestUrl.searchParams.get("offset") || "0",
    sortBy: requestUrl.searchParams.get("sortBy") || "lastPublished",
    sortOrder: requestUrl.searchParams.get("sortOrder") || "desc",
  })

  const webflowUrl = `https://api-cdn.webflow.com/v2/collections/${collectionId}/items/live?${params}`

  try {
    if (!token) {
      sendJson(res, 400, { error: "Missing Webflow API token" })
      return
    }

    const response = await fetch(webflowUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    })
    const text = await response.text()

    res.writeHead(response.status, {
      "content-type": response.headers.get("content-type") || "application/json",
      "access-control-allow-origin": "*",
    })
    res.end(text)
  } catch (error) {
    sendJson(res, 500, { error: error.message })
  }
}

function serveIndex(res) {
  fs.readFile(path.join(__dirname, "index.html"), "utf8", (error, html) => {
    if (error) {
      sendJson(res, 500, { error: error.message })
      return
    }

    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "access-control-allow-origin": "*",
    })
    res.end(html)
  })
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`)

  if (requestUrl.pathname === "/api/webflow-blog") {
    handleBlogRequest(req, res, requestUrl)
    return
  }

  serveIndex(res)
})

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Webflow CMS test page: http://localhost:${PORT}`)
  console.log(`API proxy: http://localhost:${PORT}/api/webflow-blog`)
})
