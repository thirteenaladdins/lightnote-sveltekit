import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { auth } from './auth';
import type { Tables, TablesInsert, TablesUpdate } from '$lib/supabase';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  defaultPrompt: string;
  analysisEnabled: boolean;
  [key: string]: any;
}

const defaultSettings: UserSettings = {
  theme: 'system',
  notifications: true,
  autoSave: true,
  defaultPrompt: '',
  analysisEnabled: true
};

function createSettingsStore() {
  const { subscribe, set, update } = writable<UserSettings>(defaultSettings);

  return {
    subscribe,
    load: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set(defaultSettings);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const settings: UserSettings = { ...defaultSettings };
        
        if (data) {
          data.forEach(setting => {
            settings[setting.key] = setting.value;
          });
        }

        set(settings);
      } catch (error) {
        console.error('Failed to load settings from Supabase:', error);
        set(defaultSettings);
      }
    },
    set: async (key: string, value: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      try {
        const { error } = await supabase
          .from('settings')
          .upsert({
            user_id: user.id,
            key,
            value
          });

        if (error) throw error;

        update(settings => ({ ...settings, [key]: value }));
      } catch (error) {
        console.error('Failed to save setting to Supabase:', error);
        throw error;
      }
    },
    get: (key: string) => {
      let value: any;
      subscribe(settings => {
        value = settings[key];
      })();
      return value;
    },
    reset: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      try {
        const { error } = await supabase
          .from('settings')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;

        set(defaultSettings);
      } catch (error) {
        console.error('Failed to reset settings:', error);
        throw error;
      }
    }
  };
}

export const settings = createSettingsStore();

// Subscribe to auth changes and load settings when user changes
auth.subscribe(({ user, loading }) => {
  if (!loading) {
    if (user) {
      settings.load();
    } else {
      settings.update(() => defaultSettings);
    }
  }
});
