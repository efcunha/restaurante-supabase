import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { AdminActionCardProps } from '../types';
import { Card } from '../../../ui';
import { isFeatureEnabled } from '../../../config/featureFlags';

export function AdminActionCard({
  name,
  icon,
  onPress,
  danger,
  disabled,
  subtitle,
  cardStyle,
  nameStyle,
  arrowStyle,
}: AdminActionCardProps) {
  const useUiNextAdmin = isFeatureEnabled('admin_uiNext');

  if (useUiNextAdmin) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.88}>
        <Card
          padded={false}
          style={[
            styles.reportCard,
            styles.reportCardUiNext,
            danger && styles.reportCardDanger,
            disabled && styles.reportCardDisabled,
            cardStyle,
          ]}
        >
          <View style={styles.reportInner}>
            <View style={styles.reportLeft}>
              <View style={[styles.iconBadge, danger && styles.iconBadgeDanger]}>
                <Text style={styles.reportIcon}>{icon}</Text>
              </View>
              <View style={styles.textContent}>
                <Text style={[styles.reportName, danger && styles.reportNameDanger, nameStyle as any]}>
                  {name}
                </Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
            <Text style={[styles.reportArrow, danger && styles.reportArrowDanger, arrowStyle as any]}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.reportCard,
        danger && styles.reportCardDanger,
        disabled && styles.reportCardDisabled,
        cardStyle,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
    >
      <View style={styles.reportInner}>
        <View style={styles.reportLeft}>
          <View style={[styles.iconBadge, danger && styles.iconBadgeDanger]}>
            <Text style={styles.reportIcon}>{icon}</Text>
          </View>
          <View style={styles.textContent}>
            <Text style={[styles.reportName, danger && styles.reportNameDanger, nameStyle as any]}>
              {name}
            </Text>
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Text style={[styles.reportArrow, danger && styles.reportArrowDanger, arrowStyle as any]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 78,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportCardUiNext: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  reportCardDisabled: {
    opacity: 0.55,
  },
  reportInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  reportCardDanger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  reportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  textContent: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBadgeDanger: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.28)',
  },
  reportIcon: {
    fontSize: 20,
  },
  reportName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  reportNameDanger: {
    color: colors.onDanger,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  reportArrow: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: 10,
    flexShrink: 0,
  },
  reportArrowDanger: {
    color: colors.onDanger,
  },
});