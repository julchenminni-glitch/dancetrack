import { Redirect } from 'expo-router';
export default function Index() {
  // Local-only mode: skip the login screen entirely.
  return <Redirect href="/workspace-select" />;
}
