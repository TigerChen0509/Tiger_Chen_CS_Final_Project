import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task';
import { getCurrentUser } from './authStore';

async function getStorageKey(): Promise<string> {
  const user = await getCurrentUser();
  if (user) return `tasktock_tasks_${user.email}`;
  return 'tasktock_tasks_guest';
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  try {
    const key = await getStorageKey();
    const json = JSON.stringify(tasks);
    await AsyncStorage.setItem(key, json);
  } catch (error) {
    console.error('Save error:', error);
  }
}

export async function loadTasks(): Promise<Task[]> {
  try {
    const key = await getStorageKey();
    const json = await AsyncStorage.getItem(key);
    if (!json) return [];
    return JSON.parse(json) as Task[];
  } catch (error) {
    return [];
  }
}
