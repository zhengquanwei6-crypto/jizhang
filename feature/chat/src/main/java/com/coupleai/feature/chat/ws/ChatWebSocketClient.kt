package com.coupleai.feature.chat.ws

import android.util.Log
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

data class WsMessage(
    val type: String = "text",
    val content: String,
    val senderUserId: Long? = null,
    val role: String = "user",
    val createdAt: String = ""
)

/**
 * WebSocket 聊天客户端，连后端 /ws/chat/{couple_id}?token=JWT
 */
@Singleton
class ChatWebSocketClient @Inject constructor() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private val WS_BASE = "ws://162.243.78.70/ws/chat"

    fun connect(coupleId: Long, token: String): Flow<WsMessage> = callbackFlow {
        val request = Request.Builder()
            .url("$WS_BASE/$coupleId?token=$token")
            .build()

        var ws: WebSocket? = null

        val listener = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d("WsChat", "connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val msg = parseMessage(text)
                    trySend(msg)
                } catch (e: Exception) {
                    Log.e("WsChat", "parse error: ${e.message}")
                }
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                onMessage(webSocket, bytes.utf8())
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d("WsChat", "closed: $code $reason")
                channel.close()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("WsChat", "failure: ${t.message}")
                channel.close(t)
            }
        }

        ws = client.newWebSocket(request, listener)

        awaitClose {
            ws?.close(1000, "client closed")
        }
    }

    private fun parseMessage(raw: String): WsMessage {
        val json = org.json.JSONObject(raw)
        return WsMessage(
            type = json.optString("message_type", "text"),
            content = json.optString("content", ""),
            senderUserId = json.optLong("sender_user_id", -1).takeIf { it > 0 },
            role = json.optString("role", "user"),
            createdAt = json.optString("created_at", "")
        )
    }
}
