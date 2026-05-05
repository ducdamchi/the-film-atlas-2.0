import request from "supertest"
import app from "../index.js"

export const get = (path, token) =>
  request(app).get(path).set("accesstoken", token || "")

export const post = (path, token, body) =>
  request(app).post(path).set("accesstoken", token || "").send(body)

export const put = (path, token, body) =>
  request(app).put(path).set("accesstoken", token || "").send(body)

export const del = (path, token, body) =>
  request(app).delete(path).set("accesstoken", token || "").send(body)
