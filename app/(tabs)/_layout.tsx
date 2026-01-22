/**
 * Bottom tab navigation layout
 */

import { Tabs } from 'expo-router';
import { LibraryIcon, SearchIcon, BookOpenIcon, SettingsIcon, StatisticsIcon } from '@/components/Icons';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';

export default function TabsLayout() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <LibraryIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="highlights"
        options={{
          title: 'Highlights',
          tabBarIcon: ({ color, size }) => <BookOpenIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <SearchIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <StatisticsIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
