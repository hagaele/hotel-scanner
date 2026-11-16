import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { registerConfirmHandler, type ConfirmRequest } from '@/lib/confirm';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';

type Pending = ConfirmRequest & { resolve: (ok: boolean) => void };

/**
 * Confirmação em folha inferior (bottom sheet), no lugar do alerta do sistema:
 * sobe da parte de baixo da tela, com ícone, título, explicação, tópicos opcionais e botões grandes.
 * Ações que apagam algo têm o botão em vermelho. Tocar fora ou em "Cancelar" cancela.
 * Fica no topo do app (um só para todas as telas) e atende quem chama confirmAction().
 */
export function ConfirmSheetProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  useEffect(() => {
    registerConfirmHandler(
      (request) =>
        new Promise<boolean>((resolve) => {
          // Uma confirmação nova fecha a anterior como cancelada.
          pendingRef.current?.resolve(false);
          const next = { ...request, resolve };
          pendingRef.current = next;
          setPending(next);
        }),
    );
    return () => registerConfirmHandler(null);
  }, []);

  const close = (ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  };

  return (
    <>
      {children}
      <Modal
        visible={pending !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => close(false)}>
        {pending && <Sheet request={pending} onClose={close} />}
      </Modal>
    </>
  );
}

function Sheet({ request, onClose }: { request: ConfirmRequest; onClose: (ok: boolean) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const danger = request.tone === 'danger';
  const accent = danger ? colors.error : colors.primary;

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={() => onClose(false)}
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: insets.bottom + spacing.lg },
        ]}>
        <View style={[styles.handle, { backgroundColor: colors.inputBorder }]} />
        <ScrollView contentContainerStyle={styles.body} bounces={false}>
          <View style={[styles.icon, { backgroundColor: danger ? colors.highlightBg : colors.infoBg }]}>
            <Ionicons name={request.icon ?? (danger ? 'trash-outline' : 'help-circle-outline')} size={22} color={accent} />
          </View>
          <AppText variant="title" accessibilityRole="header">
            {request.title}
          </AppText>
          {request.message ? (
            <AppText variant="body" muted>
              {request.message}
            </AppText>
          ) : null}
          {request.details?.map((line) => (
            <View key={line.text} style={styles.detail}>
              <Ionicons
                name={line.warning ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={18}
                color={line.warning ? colors.warningText : colors.aligned}
              />
              <AppText variant="label" style={styles.detailText}>
                {line.text}
              </AppText>
            </View>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <Button title={request.confirmLabel} variant={danger ? 'danger' : 'ink'} onPress={() => onClose(true)} />
          <Button title="Cancelar" variant="secondary" onPress={() => onClose(false)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10, 13, 18, 0.55)' },
  // No computador a folha não ocupa a tela toda: fica centralizada, com largura de celular.
  sheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    maxHeight: '85%',
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  body: { gap: spacing.sm, paddingBottom: spacing.lg },
  icon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  detail: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  detailText: { flex: 1 },
  actions: { gap: spacing.sm },
});
