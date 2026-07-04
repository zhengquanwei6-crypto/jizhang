package com.coupleai.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.coupleai.data.local.database.dao.AccountDao
import com.coupleai.data.local.database.dao.ChatDao
import com.coupleai.data.local.database.dao.GoalDao
import com.coupleai.data.local.database.dao.IntimacyDao
import com.coupleai.data.local.database.dao.UserDao
import com.coupleai.data.local.database.entity.AccountEntity
import com.coupleai.data.local.database.entity.AchievementEntity
import com.coupleai.data.local.database.entity.ChatMessageEntity
import com.coupleai.data.local.database.entity.CheckInEntity
import com.coupleai.data.local.database.entity.GoalEntity
import com.coupleai.data.local.database.entity.IntimacyLogEntity
import com.coupleai.data.local.database.entity.UserEntity

@Database(
    entities = [
        UserEntity::class,
        AccountEntity::class,
        ChatMessageEntity::class,
        GoalEntity::class,
        CheckInEntity::class,
        IntimacyLogEntity::class,
        AchievementEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun accountDao(): AccountDao
    abstract fun chatDao(): ChatDao
    abstract fun goalDao(): GoalDao
    abstract fun intimacyDao(): IntimacyDao
}
