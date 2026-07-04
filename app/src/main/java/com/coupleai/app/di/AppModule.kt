package com.coupleai.app.di

import android.content.Context
import android.content.SharedPreferences
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import androidx.room.Room
import com.coupleai.data.local.database.AppDatabase
import com.coupleai.data.local.datastore.UserPreferencesDataStore
import com.coupleai.data.local.mock.MockDataProvider
import com.coupleai.data.local.mock.MockRepository
import com.coupleai.data.local.repository.AccountRepository
import com.coupleai.data.local.repository.ChatRepository
import com.coupleai.data.local.repository.GoalRepository
import com.coupleai.data.local.repository.HomeRepository
import com.coupleai.data.local.repository.MineRepository
import com.coupleai.data.local.repository.RelationshipRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "couple_space_prefs")

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "couple_space_db"
        ).build()
    }

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.dataStore
    }

    @Provides
    @Singleton
    fun provideUserPreferencesDataStore(dataStore: DataStore<Preferences>): UserPreferencesDataStore {
        return UserPreferencesDataStore(dataStore)
    }

    @Provides
    @Singleton
    fun provideMockDataProvider(): MockDataProvider {
        return MockDataProvider()
    }

    @Provides
    @Singleton
    fun provideMockRepository(mockDataProvider: MockDataProvider): MockRepository {
        return MockRepository(mockDataProvider)
    }

    @Provides
    @Singleton
    fun provideHomeRepository(mockRepository: MockRepository): HomeRepository {
        return HomeRepository(mockRepository)
    }

    @Provides
    @Singleton
    fun provideAccountRepository(mockRepository: MockRepository): AccountRepository {
        return AccountRepository(mockRepository)
    }

    @Provides
    @Singleton
    fun provideChatRepository(mockRepository: MockRepository): ChatRepository {
        return ChatRepository(mockRepository)
    }

    @Provides
    @Singleton
    fun provideGoalRepository(mockRepository: MockRepository): GoalRepository {
        return GoalRepository(mockRepository)
    }

    @Provides
    @Singleton
    fun provideRelationshipRepository(mockRepository: MockRepository): RelationshipRepository {
        return RelationshipRepository(mockRepository)
    }

    @Provides
    @Singleton
    fun provideMineRepository(mockRepository: MockRepository): MineRepository {
        return MineRepository(mockRepository)
    }
}
