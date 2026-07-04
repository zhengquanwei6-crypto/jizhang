package com.coupleai.data.local.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.coupleai.data.local.database.entity.ChatMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE coupleId = :coupleId ORDER BY createdAt ASC")
    fun getMessages(coupleId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages WHERE coupleId = :coupleId ORDER BY createdAt DESC LIMIT :limit")
    fun getRecentMessages(coupleId: String, limit: Int): Flow<List<ChatMessageEntity>>

    @Query("SELECT COUNT(*) FROM chat_messages WHERE coupleId = :coupleId AND isRead = 0 AND senderId != :myId")
    fun getUnreadCount(coupleId: String, myId: String): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: ChatMessageEntity): Long

    @Query("UPDATE chat_messages SET isRead = 1 WHERE coupleId = :coupleId AND senderId != :myId")
    suspend fun markAllAsRead(coupleId: String, myId: String)

    @Query("DELETE FROM chat_messages WHERE id = :id")
    suspend fun delete(id: Long)
}
