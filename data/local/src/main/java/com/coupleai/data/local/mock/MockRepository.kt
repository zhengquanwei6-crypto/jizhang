package com.coupleai.data.local.mock

import com.coupleai.data.local.database.entity.AccountEntity
import com.coupleai.data.local.database.entity.AchievementEntity
import com.coupleai.data.local.database.entity.ChatMessageEntity
import com.coupleai.data.local.database.entity.GoalEntity
import com.coupleai.data.local.database.entity.IntimacyLogEntity
import com.coupleai.data.local.database.entity.UserEntity
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockRepository @Inject constructor(
    private val provider: MockDataProvider
) {
    fun getUser(): UserEntity = provider.getMockUser()
    fun getPartner(): UserEntity = provider.getMockPartner()
    fun getAccounts(): List<AccountEntity> = provider.getMockAccounts()
    fun getChatMessages(): List<ChatMessageEntity> = provider.getMockChatMessages()
    fun getGoals(): List<GoalEntity> = provider.getMockGoals()
    fun getAchievements(): List<AchievementEntity> = provider.getMockAchievements()
    fun getIntimacyLogs(): List<IntimacyLogEntity> = provider.getMockIntimacyLogs()
}
