package com.coupleai.data.remote.repository

import com.coupleai.data.remote.api.ChatApi
import com.coupleai.data.remote.dto.ChatMessageCreate
import com.coupleai.data.remote.dto.ChatMessageOut
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val chatApi: ChatApi
) {
    suspend fun getMessages(limit: Int = 50): List<ChatMessageOut> =
        chatApi.getMessages(limit)

    suspend fun sendMessage(content: String, type: String = "text"): ChatMessageOut =
        chatApi.sendMessage(ChatMessageCreate(type, content))
}
