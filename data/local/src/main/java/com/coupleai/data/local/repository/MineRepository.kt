package com.coupleai.data.local.repository

import com.coupleai.data.local.mock.MockRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MineRepository @Inject constructor(
    private val mock: MockRepository
) {
    fun getUserName() = mock.getUser().nickname
    fun getPartnerName() = mock.getPartner().nickname
    fun getLoveDays() = 128L
}
