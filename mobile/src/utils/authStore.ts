import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'tasktock_users';
const SESSION_KEY = 'tasktock_session';

export interface User {
  email: string;
  password: string;
  name: string;
}

export async function getUsers(): Promise<User[]> {
  try {
    const json = await AsyncStorage.getItem(USERS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function signUp(email: string, password: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const users = await getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: 'An account with this email already exists.' };
  }
  users.push({ email: email.trim(), password, name: name.trim() });
  await saveUsers(users);
  await AsyncStorage.setItem(SESSION_KEY, email.trim());
  return { ok: true };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const users = await getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { ok: false, error: 'No account found with this email.' };
  if (user.password !== password) return { ok: false, error: 'Incorrect password.' };
  await AsyncStorage.setItem(SESSION_KEY, user.email);
  return { ok: true };
}

export async function resetPassword(email: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const users = await getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return { ok: false, error: 'No account found with this email.' };
  users[idx].password = newPassword;
  await saveUsers(users);
  return { ok: true };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const email = await AsyncStorage.getItem(SESSION_KEY);
    if (!email) return null;
    const users = await getUsers();
    return users.find((u) => u.email === email) ?? null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function updateUserName(newName: string): Promise<{ ok: boolean; error?: string }> {
  const email = await AsyncStorage.getItem(SESSION_KEY);
  if (!email) return { ok: false, error: 'Not logged in.' };
  const users = await getUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return { ok: false, error: 'User not found.' };
  users[idx].name = newName.trim();
  await saveUsers(users);
  return { ok: true };
}
