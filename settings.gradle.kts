pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "CoupleSpaceAI"

include(":app")

include(":core:common")
include(":core:design")
include(":core:animation")

include(":data:local")

include(":feature:home")
include(":feature:account")
include(":feature:chat")
include(":feature:relationship")
include(":feature:ai")
include(":feature:location")
include(":feature:goal")
include(":feature:mine")
