package com.kl.adm.data.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.checklistPrefs: DataStore<Preferences> by preferencesDataStore(name = "checklist_in_progress")

object ChecklistInProgressPrefs {

    private const val KEY_ESCOPO_ID = "escopo_id"

    suspend fun setChecklistInProgress(context: Context, escopoId: String) {
        context.checklistPrefs.edit { prefs ->
            prefs[stringPreferencesKey(KEY_ESCOPO_ID)] = escopoId
        }
    }

    suspend fun clear(context: Context) {
        context.checklistPrefs.edit { prefs ->
            prefs.remove(stringPreferencesKey(KEY_ESCOPO_ID))
        }
    }

    suspend fun getChecklistInProgress(context: Context): String? {
        return context.checklistPrefs.data.map { prefs ->
            prefs[stringPreferencesKey(KEY_ESCOPO_ID)]
        }.first()
    }
}
