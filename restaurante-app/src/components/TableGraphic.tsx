import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';
type TableShape = 'square' | 'round' | 'rect';
type TableStatus = 'Livre' | 'Ocupada' | 'Reservada' | 'Pagando';

interface TableGraphicProps {
    shape: TableShape;
    seats: number;
    status: TableStatus;
    size?: number;
    tableNumber?: string;
}

export default function TableGraphic({
    shape,
    seats,
    status,
    size = 80,
    tableNumber
}: TableGraphicProps) {

    // Colors
    const woodColor = colors.textSecondary; // Main table color (free)
    const occupiedColor = colors.danger;
    const reservedColor = colors.border;

    // Status color (inner surface)
    const getStatusColor = () => {
        switch (status) {
            case 'Ocupada': return occupiedColor;
            case 'Pagando': return colors.warning;
            case 'Reservada': return reservedColor;
            default: return colors.background; // Table cloth white/beige for free
        }
    };

    // Border color (wood frame)
    const getBorderColor = () => {
        switch (status) {
            case 'Ocupada': return colors.danger;
            case 'Pagando': return colors.warning;
            case 'Reservada': return colors.textSecondary;
            default: return woodColor; // Wood border for free
        }
    };

    const statusColor = getStatusColor();
    const borderColor = getBorderColor();

    // Dimensions based on shape
    const tableWidth = shape === 'rect' ? size * 1.6 : size;
    const tableHeight = size;
    const borderRadius = shape === 'round' ? size : 12;

    const surfaceStyle = {
        width: tableWidth,
        height: tableHeight,
        borderRadius: borderRadius,
        backgroundColor: statusColor,
        borderColor: borderColor,
        borderWidth: 4,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 10,
    };

    // Chair Rendering Logic
    const renderChairs = () => {
        const chairSize = 16;
        const chairColor = borderColor; // Match table border (wood)
        const chairs = [];
        const spacing = 2; // visual spacing from table edge

        if (shape === 'round') {
            // Radial distribution
            // Ensure even distribution
            const angleStep = (2 * Math.PI) / seats;

            for (let i = 0; i < seats; i++) {
                const angle = i * angleStep - (Math.PI / 2); // Start top
                // Center of the table is at (tableWidth/2, tableHeight/2)
                const centerX = tableWidth / 2;
                const centerY = tableHeight / 2;

                const top = centerY + (Math.sin(angle) * (tableHeight / 2 + spacing + chairSize / 2)) - (chairSize / 2);
                const left = centerX + (Math.cos(angle) * (tableWidth / 2 + spacing + chairSize / 2)) - (chairSize / 2);

                chairs.push(
                    <View
                        key={`c-${i}`}
                        style={{
                            position: 'absolute',
                            width: chairSize,
                            height: chairSize,
                            backgroundColor: chairColor,
                            borderRadius: (size / 2),
                            zIndex: 1,
                            top,
                            left
                        }}
                    />
                );
            }
        } else {
            // Square/Rect: Distribute sides
            // Define sides logic
            const sides = [
                { side: 'top', count: 0 },
                { side: 'bottom', count: 0 },
                { side: 'left', count: 0 },
                { side: 'right', count: 0 }
            ];

            let remaining = seats;

            if (shape === 'rect') {
                // Heuristic: Fill long sides (Top/Bottom) first
                // e.g. 6 seats -> 2 top, 2 bot, 1 left, 1 right
                while (remaining > 0) {
                    sides[0].count++; remaining--; if (remaining === 0) break;
                    sides[1].count++; remaining--; if (remaining === 0) break;
                    if (remaining > 0 && sides[2].count === 0) { sides[2].count++; remaining--; }
                    if (remaining > 0 && sides[3].count === 0) { sides[3].count++; remaining--; }
                }
            } else {
                // Square: Round robin
                let sideIdx = 0;
                while (remaining > 0) {
                    sides[sideIdx].count++;
                    remaining--;
                    sideIdx = (sideIdx + 1) % 4;
                }
            }

            // Render based on counts
            const renderSideChairs = (side: string, count: number) => {
                if (count === 0) return [];
                const sideChairs = [];
                const tW = tableWidth;
                const tH = tableHeight;

                // Top
                if (side === 'top') {
                    const step = tW / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(
                            <View
                                key={`top-${i}`}
                                style={[styles.chair, {
                                    backgroundColor: chairColor,
                                    top: -chairSize - spacing,
                                    left: (step * i) - (chairSize / 2)
                                }]}
                            />
                        );
                    }
                }
                // Bottom
                if (side === 'bottom') {
                    const step = tW / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(
                            <View
                                key={`bot-${i}`}
                                style={[styles.chair, {
                                    backgroundColor: chairColor,
                                    bottom: -chairSize - spacing,
                                    left: (step * i) - (chairSize / 2)
                                }]}
                            />
                        );
                    }
                }
                // Left
                if (side === 'left') {
                    const step = tH / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(
                            <View
                                key={`left-${i}`}
                                style={[styles.chair, {
                                    backgroundColor: chairColor,
                                    left: -chairSize - spacing,
                                    top: (step * i) - (chairSize / 2)
                                }]}
                            />
                        );
                    }
                }
                // Right
                if (side === 'right') {
                    const step = tH / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(
                            <View
                                key={`right-${i}`}
                                style={[styles.chair, {
                                    backgroundColor: chairColor,
                                    right: -chairSize - spacing,
                                    top: (step * i) - (chairSize / 2)
                                }]}
                            />
                        );
                    }
                }
                return sideChairs;
            };

            sides.forEach(s => chairs.push(...renderSideChairs(s.side, s.count)));
        }

        return chairs;
    };


    return (
        <View style={[styles.container, { width: tableWidth + 40, height: tableHeight + 40 }]}>
            {/* Chairs Container - centered */}
            <View style={{ position: 'absolute', width: tableWidth, height: tableHeight }}>
                {renderChairs()}
            </View>

            {/* Table Top */}
            <View style={surfaceStyle}>
                <Text style={[styles.tableNumber, { color: status === 'Ocupada' ? colors.white : colors.text }]}>
                    {tableNumber}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        margin: 5
    },
    tableNumber: {
        fontWeight: 'bold',
        fontSize: 18,
    },
    chair: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 4,
        zIndex: 1,
    }
});
