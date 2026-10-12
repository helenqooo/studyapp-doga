import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthConfig, useLogin, useRegister } from '../api/hooks';
import type { AvatarKey } from '../api/types';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Appear } from '../components/motion/Appear';
import { PressableScale } from '../components/motion/PressableScale';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { API_URL } from '../config';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme';

type Mode = 'login' | 'register';
const AVATARS: AvatarKey[] = ['clay', 'kraft', 'olive', 'sky', 'plum', 'sand', 'slate', 'rose'];
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const config = useAuthConfig();
  const login = useLogin();
  const register = useRegister();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarKey>('clay');
  const [touched, setTouched] = useState(false);

  const registering = mode === 'register';
  const busy = login.isPending || register.isPending;
  const error = (registering ? register.error : login.error)?.message;
  const name = username.trim().toLocaleLowerCase('en-US');
  const usernameOk = USERNAME_RE.test(name);
  const passwordOk = password.length >= 8;
  const formOk = registering ? usernameOk && passwordOk && displayName.trim().length > 0 : name.length > 0 && password.length > 0;
  const closed = config.data && !config.data.registrationOpen;

  const submit = () => {
    setTouched(true);
    if (!formOk || busy) return;
    haptics.press();
    const onError = () => haptics.error();
    if (registering) {
      register.mutate(
        { username: name, password, displayName: displayName.trim(), inviteCode: inviteCode.trim() || undefined, avatar },
        { onError },
      );
    } else {
      login.mutate({ username: name, password }, { onError });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.layout.screenPadding,
        }}
      >
        <View style={{ width: '100%', maxWidth: theme.layout.readableWidth * 0.62, alignSelf: 'center', gap: theme.spacing.xl }}>
          <Appear style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <View
              style={{
                width: theme.layout.resultBadge,
                height: theme.layout.resultBadge,
                borderRadius: theme.radius.xl,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText family="serif" weight="semibold" tint={theme.colors.textOnAccent} style={{ fontSize: theme.fontSize.display, lineHeight: theme.fontSize.display * 1.2 }}>
                d
              </AppText>
            </View>
            <AppText variant="display" align="center">
              Derece
            </AppText>
            <AppText color="textMuted" align="center">
              Soruyu çek, netini büyüt.
            </AppText>
          </Appear>

          <Appear index={1}>
            <Card>
              <SegmentedControl<Mode>
                options={[
                  { value: 'login', label: 'Giriş yap' },
                  { value: 'register', label: 'Hesap oluştur' },
                ]}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setTouched(false);
                }}
              />

              {registering && closed ? (
                <AppText color="textMuted">Kayıt şu an kapalı. Sunucu sahibinden davet kodu iste.</AppText>
              ) : null}

              <TextField
                label="Kullanıcı adı"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                error={touched && registering && !usernameOk}
                hint={registering ? '3–20 karakter: küçük harf, rakam, nokta, alt çizgi.' : undefined}
              />
              {registering ? (
                <TextField
                  label="Görünen ad"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  maxLength={30}
                  hint="Sıralamada arkadaşların bunu görür."
                  error={touched && !displayName.trim()}
                />
              ) : null}
              <TextField
                label="Şifre"
                value={password}
                onChangeText={setPassword}
                secret
                autoComplete={registering ? 'new-password' : 'current-password'}
                textContentType={registering ? 'newPassword' : 'password'}
                onSubmitEditing={submit}
                returnKeyType="go"
                error={touched && registering && !passwordOk}
                hint={registering ? 'En az 8 karakter.' : undefined}
              />
              {registering && config.data?.inviteRequired ? (
                <TextField
                  label="Davet kodu"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint="Sunucuyu kuran kişiden al."
                />
              ) : null}

              {registering ? (
                <View style={{ gap: theme.spacing.xs }}>
                  <AppText variant="label" color="textMuted">
                    Renk
                  </AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {AVATARS.map((key) => (
                      <PressableScale
                        key={key}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: avatar === key }}
                        accessibilityLabel={`Renk ${key}`}
                        onPress={() => {
                          haptics.select();
                          setAvatar(key);
                        }}
                        style={{
                          width: theme.layout.minTouch,
                          height: theme.layout.minTouch,
                          borderRadius: theme.radius.pill,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: theme.layout.frameBorder,
                          borderColor: avatar === key ? theme.colors.text : theme.colors.transparent,
                        }}
                      >
                        <Avatar name={displayName || username || 'D'} color={key} size={theme.layout.minTouch - theme.spacing.sm} />
                      </PressableScale>
                    ))}
                  </View>
                </View>
              ) : null}

              {error ? (
                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
                  <Icon name="triangle-alert" size={theme.layout.iconSize.sm} color={theme.colors.danger} />
                  <AppText color="danger" style={{ flex: 1 }}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <Button
                label={registering ? 'Hesabı oluştur' : 'Giriş yap'}
                icon={registering ? 'sparkles' : 'arrow-right'}
                size="lg"
                loading={busy}
                disabled={registering && !!closed}
                onPress={submit}
              />
            </Card>
          </Appear>

          <Appear index={2}>
            <AppText variant="caption" color="textMuted" align="center" selectable>
              {API_URL ? `Sunucu: ${API_URL}` : 'Sunucu adresi tanımlı değil (EXPO_PUBLIC_API_URL).'}
            </AppText>
          </Appear>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
