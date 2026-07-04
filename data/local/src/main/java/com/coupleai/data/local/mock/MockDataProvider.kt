package com.coupleai.data.local.mock

import com.coupleai.data.local.database.entity.AccountEntity
import com.coupleai.data.local.database.entity.AchievementEntity
import com.coupleai.data.local.database.entity.ChatMessageEntity
import com.coupleai.data.local.database.entity.GoalEntity
import com.coupleai.data.local.database.entity.IntimacyLogEntity
import com.coupleai.data.local.database.entity.UserEntity
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockDataProvider @Inject constructor() {

    private val coupleId = "mock_couple_001"

    fun getMockUser(): UserEntity {
        return UserEntity(
            id = "user_xiaoming",
            nickname = "小明",
            avatarUrl = null,
            loveStartDate = System.currentTimeMillis() - 128L * 24 * 60 * 60 * 1000
        )
    }

    fun getMockPartner(): UserEntity {
        return UserEntity(
            id = "user_xiaohong",
            nickname = "小红",
            avatarUrl = null,
            loveStartDate = System.currentTimeMillis() - 128L * 24 * 60 * 60 * 1000
        )
    }

    fun getMockAccounts(): List<AccountEntity> {
        val categories = listOf("餐饮", "购物", "交通", "娱乐", "居住", "医疗", "教育", "其他")
        val types = listOf("expense", "expense", "expense", "income")
        return (1..30).map { i ->
            val cal = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_YEAR, -i)
            }
            AccountEntity(
                id = i.toLong(),
                coupleId = coupleId,
                amount = (10..500).random().toDouble(),
                category = categories.random(),
                type = types.random(),
                note = if ((0..1).random() == 1) listOf("晚餐", "约会", "超市购物", "打车", "电影", "加油").random() else null,
                date = cal.timeInMillis,
                createdBy = if ((0..1).random() == 1) "user_xiaoming" else "user_xiaohong"
            )
        }
    }

    fun getMockChatMessages(): List<ChatMessageEntity> {
        val messages = listOf(
            "早安呀，今天也要加油哦" to "user_xiaohong",
            "早安！今天中午一起吃饭吧" to "user_xiaoming",
            "好呀，去哪家？" to "user_xiaohong",
            "上次那家日料还不错" to "user_xiaoming",
            "好！12点见" to "user_xiaohong",
            "爱你哟" to "user_xiaohong",
            "今天的月亮好圆" to "user_xiaohong",
            "是啊，像你圆圆的脸" to "user_xiaoming",
            "哼，讨厌！" to "user_xiaohong",
            "哈哈哈哈哈哈" to "user_xiaoming",
            "今天打卡了哦" to "user_xiaohong",
            "我也打了，今天也要坚持" to "user_xiaoming",
            "周末去哪玩呀" to "user_xiaohong",
            "去爬山怎么样？" to "user_xiaoming",
            "好主意！看日落" to "user_xiaohong",
        )
        val now = System.currentTimeMillis()
        return messages.mapIndexed { index, (content, senderId) ->
            ChatMessageEntity(
                id = index.toLong(),
                coupleId = coupleId,
                senderId = senderId,
                content = content,
                type = "text",
                isRead = true,
                createdAt = now - (messages.size - index) * 5L * 60 * 1000
            )
        }
    }

    fun getMockGoals(): List<GoalEntity> {
        return listOf(
            GoalEntity(id = 1, coupleId = coupleId, title = "每日阅读", description = "每天阅读30分钟", frequency = "daily", targetDays = 7, createdBy = "user_xiaoming"),
            GoalEntity(id = 2, coupleId = coupleId, title = "健身打卡", description = "每周锻炼3次", frequency = "weekly", targetDays = 3, createdBy = "user_xiaohong"),
            GoalEntity(id = 3, coupleId = coupleId, title = "早睡早起", description = "每天11点前睡觉", frequency = "daily", targetDays = 7, createdBy = "user_xiaoming"),
            GoalEntity(id = 4, coupleId = coupleId, title = "喝水提醒", description = "每天喝8杯水", frequency = "daily", targetDays = 7, createdBy = "user_xiaohong"),
        )
    }

    fun getMockAchievements(): List<AchievementEntity> {
        return listOf(
            AchievementEntity(id = "ach_1", title = "初次心动", description = "成为情侣", icon = "heart", requirement = 1, type = "check_in_streak"),
            AchievementEntity(id = "ach_2", title = "7天打卡", description = "连续打卡7天", icon = "calendar", requirement = 7, type = "check_in_streak"),
            AchievementEntity(id = "ach_3", title = "甜蜜聊家", description = "发送100条消息", icon = "chat", requirement = 100, type = "chat_count"),
            AchievementEntity(id = "ach_4", title = "记账达人", description = "记录50笔账单", icon = "wallet", requirement = 50, type = "account_sum"),
            AchievementEntity(id = "ach_5", title = "30天打卡", description = "连续打卡30天", icon = "trophy", requirement = 30, type = "check_in_streak"),
            AchievementEntity(id = "ach_6", title = "心心相印", description = "达到Lv.5亲密度", icon = "star", requirement = 5, type = "intimacy_level"),
        )
    }

    fun getMockIntimacyLogs(): List<IntimacyLogEntity> {
        val actions = listOf("check_in", "chat", "account", "anniversary")
        val now = System.currentTimeMillis()
        return (1..20).map { i ->
            IntimacyLogEntity(
                id = i.toLong(),
                coupleId = coupleId,
                userId = if (i % 2 == 0) "user_xiaoming" else "user_xiaohong",
                action = actions.random(),
                points = listOf(1, 2, 5, 10).random(),
                createdAt = now - i * 60 * 60 * 1000L
            )
        }
    }
}
