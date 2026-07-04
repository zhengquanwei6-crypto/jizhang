package com.coupleai.data.remote.util

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

object ApiErrorParser {
    private val json = Json { ignoreUnknownKeys = true }

    fun parse(error: Throwable): String {
        if (error is HttpException) {
            parseBody(error)?.let { return it }
            return when (error.code()) {
                400 -> "请求参数错误"
                401 -> "账号或密码错误"
                403 -> "没有权限"
                404 -> "资源不存在"
                409 -> "该账号已注册"
                422 -> "输入格式不正确"
                in 500..599 -> "服务器繁忙，请稍后再试"
                else -> "请求失败 (${error.code()})"
            }
        }
        return when (error) {
            is UnknownHostException -> "网络连接失败，请检查网络"
            is SocketTimeoutException -> "连接超时，请稍后重试"
            is IOException -> "网络异常，请检查网络"
            else -> error.message?.takeIf { it.isNotBlank() } ?: "操作失败，请重试"
        }
    }

    private fun parseBody(error: HttpException): String? {
        val raw = error.response()?.errorBody()?.string()?.trim().orEmpty()
        if (raw.isBlank()) return null
        return try {
            when (val element = json.parseToJsonElement(raw)) {
                is JsonObject -> element["detail"]?.let(::formatDetail)
                else -> null
            }
        } catch (_: Exception) {
            raw.take(120)
        }
    }

    private fun formatDetail(detail: JsonElement): String {
        return when (detail) {
            is JsonPrimitive -> detail.content
            is JsonArray -> detail.joinToString("\n") { item ->
                item.jsonObject["msg"]?.jsonPrimitive?.content ?: item.toString()
            }
            else -> detail.toString()
        }
    }
}
