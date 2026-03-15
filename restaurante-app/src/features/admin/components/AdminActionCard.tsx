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
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Card
          padded={false}
          style={[
            styles.reportCard,
            styles.reportCardUiNext,
            danger && styles.reportCardDanger,
            cardStyle,
          ]}
        >
          <View style={styles.reportInner}>
            <View style={styles.reportLeft}>
              <Text style={styles.reportIcon}>{icon}</Text>
              <View>
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
        cardStyle,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.reportInner}>
        <View style={styles.reportLeft}>
          <Text style={styles.reportIcon}>{icon}</Text>
          <View>
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
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
  reportInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  reportIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  reportNameDanger: {
    color: colors.onDanger,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportArrow: {
    fontSize: 20,
    color: colors.textSecondary,
    marginLeft: 10,
  },
  reportArrowDanger: {
    color: colors.onDanger,
  },
});