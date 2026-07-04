package com.coupleai.data.local.repository

import com.coupleai.data.local.database.entity.ChatMessageEntity
import com.coupleai.data.local.mock.MockRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getMessages(): Flow<List<ChatMessageEntity>> = flow {
        emit(mock.getChatMessages())
    }

    fun getUnreadCount(): Flow<Int> = flow {
        emit(3)
    }
}
