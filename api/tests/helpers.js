const request = require("supertest")
const app = require("../index")

const get = (path, token) =>
  request(app).get(path).set("accesstoken", token || "")

const post = (path, token, body) =>
  request(app).post(path).set("accesstoken", token || "").send(body)

const put = (path, token, body) =>
  request(app).put(path).set("accesstoken", token || "").send(body)

const del = (path, token, body) =>
  request(app).delete(path).set("accesstoken", token || "").send(body)

module.exports = { get, post, put, del }
