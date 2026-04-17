const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();

app.use("/auth", createProxyMiddleware({
  target: "http://auth-service:5001",
  changeOrigin: true
}));

app.use("/appointments", createProxyMiddleware({
  target: "http://appointment-service:5002",
  changeOrigin: true
}));

app.get("/", (req, res) => {
  res.send("API Gateway is running 🚀");
});



app.listen(5000, () => console.log("Gateway running on 5000"));