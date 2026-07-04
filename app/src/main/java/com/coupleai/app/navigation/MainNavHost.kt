package com.coupleai.app.navigation

import android.content.Intent
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.TrackChanges
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.coupleai.app.auth.AuthActivity
import com.coupleai.core.design.theme.ChampagneGold
import com.coupleai.core.design.theme.InkBlack
import com.coupleai.core.design.theme.PearlBackground
import com.coupleai.core.design.theme.RosePink
import com.coupleai.core.design.theme.SecondaryText
import com.coupleai.feature.account.ui.AccountScreen
import com.coupleai.feature.ai.ui.AiScreen
import com.coupleai.feature.chat.ui.ChatScreen
import com.coupleai.feature.goal.ui.GoalScreen
import com.coupleai.feature.home.ui.HomeScreen
import com.coupleai.feature.location.ui.LocationScreen
import com.coupleai.feature.mine.ui.MineScreen
import com.coupleai.feature.relationship.ui.RelationshipScreen

data class BottomNavItem(
    val label: String,
    val route: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
)

val bottomNavItems = listOf(
    BottomNavItem("首页", Screen.Home.route, Icons.Filled.Home, Icons.Outlined.Home),
    BottomNavItem("记账", Screen.Account.route, Icons.Filled.AccountBalanceWallet, Icons.Outlined.AccountBalanceWallet),
    BottomNavItem("聊天", Screen.Chat.route, Icons.Filled.Favorite, Icons.Outlined.FavoriteBorder),
    BottomNavItem("目标", Screen.Goal.route, Icons.Filled.TrackChanges, Icons.Outlined.TrackChanges),
    BottomNavItem("我的", Screen.Mine.route, Icons.Filled.Person, Icons.Outlined.Person),
)

@Composable
fun MainNavHost(navController: NavHostController) {
    val navBackStackEntry = navController.currentBackStackEntryAsState().value
    val currentDest = navBackStackEntry?.destination
    val showBottomBar = currentDest?.route in bottomNavItems.map { it.route }
    val context = LocalContext.current

    val openAuth: () -> Unit = {
        context.startActivity(Intent(context, AuthActivity::class.java))
    }

    Scaffold(
        modifier = Modifier
            .fillMaxSize()
            .background(PearlBackground),
        containerColor = PearlBackground,
        bottomBar = {
            if (showBottomBar) {
                CoupleBottomBar(
                    items = bottomNavItems,
                    currentRoute = currentDest?.route,
                    onItemClick = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onFabClick = {
                        navController.navigate(Screen.AccountQuickAdd.route) {
                            launchSingleTop = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Home.route,
            modifier = Modifier
                .padding(innerPadding)
                .statusBarsPadding(),
            enterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300),
                    initialOffset = { it / 4 }
                )
            },
            exitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.Start,
                    animationSpec = tween(300),
                    targetOffset = { -it / 4 }
                )
            },
            popEnterTransition = {
                slideIntoContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300),
                    initialOffset = { it / 4 }
                )
            },
            popExitTransition = {
                slideOutOfContainer(
                    AnimatedContentTransitionScope.SlideDirection.End,
                    animationSpec = tween(300),
                    targetOffset = { -it / 4 }
                )
            }
        ) {
            composable(Screen.Home.route) { HomeScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Account.route) { AccountScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.AccountQuickAdd.route) {
                AccountScreen(navController, onOpenAuth = openAuth, openAddOnStart = true)
            }
            composable(Screen.Chat.route) { ChatScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Goal.route) { GoalScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Mine.route) { MineScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Relationship.route) { RelationshipScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Ai.route) { AiScreen(navController, onOpenAuth = openAuth) }
            composable(Screen.Location.route) { LocationScreen(navController, onOpenAuth = openAuth) }
        }
    }
}

@Composable
private fun CoupleBottomBar(
    items: List<BottomNavItem>,
    currentRoute: String?,
    onItemClick: (String) -> Unit,
    onFabClick: () -> Unit
) {
    val leftItems = items.take(2)
    val rightItems = items.takeLast(3)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
    ) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    leftItems.forEach { item ->
                        BottomNavCell(
                            item = item,
                            selected = currentRoute == item.route,
                            onClick = { onItemClick(item.route) }
                        )
                    }
                }

                Spacer(modifier = Modifier.width(72.dp))

                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    rightItems.forEach { item ->
                        BottomNavCell(
                            item = item,
                            selected = currentRoute == item.route,
                            onClick = { onItemClick(item.route) }
                        )
                    }
                }
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = (-22).dp)
                .size(56.dp)
                .shadow(10.dp, CircleShape)
                .clip(CircleShape)
                .background(InkBlack)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onFabClick
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Filled.Add,
                contentDescription = "快捷记账",
                tint = ChampagneGold,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
private fun BottomNavCell(
    item: BottomNavItem,
    selected: Boolean,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .clip(CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = if (selected) item.selectedIcon else item.unselectedIcon,
            contentDescription = item.label,
            tint = if (selected) RosePink else SecondaryText,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = item.label,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) RosePink else SecondaryText
        )
        if (selected) {
            Box(
                modifier = Modifier
                    .padding(top = 3.dp)
                    .size(width = 16.dp, height = 2.dp)
                    .clip(CircleShape)
                    .background(ChampagneGold)
            )
        }
    }
}
