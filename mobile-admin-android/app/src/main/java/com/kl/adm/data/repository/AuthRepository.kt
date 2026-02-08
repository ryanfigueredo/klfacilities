package com.kl.adm.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth")

class AuthRepository(private val context: Context) {

    private val tokenKey = stringPreferencesKey("auth_token")
    private val userIdKey = stringPreferencesKey("user_id")
    private val userNameKey = stringPreferencesKey("user_name")
    private val userEmailKey = stringPreferencesKey("user_email")
    private val userRoleKey = stringPreferencesKey("user_role")
    private val savedEmailKey = stringPreferencesKey("saved_email")
    private val savedPasswordKey = stringPreferencesKey("saved_password")
    private val savePasswordCheckedKey = booleanPreferencesKey("save_password_checked")

    val token: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[tokenKey]
    }

    suspend fun getToken(): String? = context.dataStore.data.map { it[tokenKey] }.first()

    suspend fun saveAuth(token: String, userId: String, name: String, email: String, role: String) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[userIdKey] = userId
            prefs[userNameKey] = name
            prefs[userEmailKey] = email
            prefs[userRoleKey] = role
        }
    }

    suspend fun getSavedUser(): SavedUser? {
        val prefs = context.dataStore.data.first()
        val token = prefs[tokenKey] ?: return null
        val id = prefs[userIdKey] ?: return null
        val name = prefs[userNameKey] ?: return null
        val email = prefs[userEmailKey] ?: return null
        val role = prefs[userRoleKey] ?: return null
        return SavedUser(id, name, email, role, token)
    }

    suspend fun clearAuth() {
        context.dataStore.edit { it.clear() }
    }

    /** Credenciais salvas (email/senha) para pré-preenchimento e "Salvar senha". */
    data class SavedCredentials(val email: String, val password: String)

    suspend fun getSavedCredentials(): SavedCredentials? {
        val prefs = context.dataStore.data.first()
        val email = prefs[savedEmailKey] ?: return null
        val password = prefs[savedPasswordKey] ?: return null
        return SavedCredentials(email, password)
    }

    suspend fun getSavePasswordChecked(): Boolean {
        return context.dataStore.data.first()[savePasswordCheckedKey] ?: false
    }

    suspend fun saveCredentials(email: String, password: String, checked: Boolean) {
        context.dataStore.edit { prefs ->
            prefs[savePasswordCheckedKey] = checked
            if (checked) {
                prefs[savedEmailKey] = email
                prefs[savedPasswordKey] = password
            } else {
                prefs.remove(savedEmailKey)
                prefs.remove(savedPasswordKey)
            }
        }
    }

    data class SavedUser(
        val id: String,
        val name: String,
        val email: String,
        val role: String,
        val token: String
    )
}
