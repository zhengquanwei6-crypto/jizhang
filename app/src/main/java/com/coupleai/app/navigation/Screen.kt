package com.coupleai.app.navigation

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Account : Screen("account")
    data object AccountQuickAdd : Screen("account/add")
    data object Chat : Screen("chat")
    data object Relationship : Screen("relationship")
    data object Ai : Screen("ai")
    data object Location : Screen("location")
    data object Goal : Screen("goal")
    data object Mine : Screen("mine")
}
