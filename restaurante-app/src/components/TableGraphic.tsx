import React, { useMemo } from 'react';
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
    const woodColor = '#8D6E63'; // Main table color (free)
    const occupiedColor = '#E57373'; // Red lighten
    const reservedColor = '#BDBDBD';

    // Status color (inner surface)
    const getStatusColor = () => {
        switch (status) {
            case 'Ocupada': return occupiedColor;
            case 'Pagando': return '#FFD54F';
            case 'Reservada': return reservedColor;
            default: return '#F5F5DC'; // Table cloth white/beige for free
        }
    };

    // Border color (wood frame)
    const getBorderColor = () => {
        switch (status) {
            case 'Ocupada': return '#D32F2F';
            case 'Pagando': return '#FFA000';
            case 'Reservada': return '#757575';
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
        shadowColor: "#000",
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

        // Helper to create chair view
        const Chair = ({ style, keyVal }: { style: any, keyVal: string }) => (
            <View key={keyVal} style={[{
                position: 'absolute',
                width: chairSize,
                height: chairSize,
                backgroundColor: chairColor,
                borderRadius: shape === 'round' ? 8 : 4,
                zIndex: 1, // Below table
            }, style]} />
        );

        if (shape === 'round') {
            // Radial distribution
            const radius = (size / 2) + spacing + (chairSize / 2);
            // Ensure even distribution
            const angleStep = (2 * Math.PI) / seats;

            for (let i = 0; i < seats; i++) {
                const angle = i * angleStep - (Math.PI / 2); // Start top
                // Center of the table is at (tableWidth/2, tableHeight/2)
                const centerX = tableWidth / 2;
                const centerY = tableHeight / 2;

                const top = centerY + (Math.sin(angle) * (tableHeight / 2 + spacing + chairSize / 2)) - (chairSize / 2);
                const left = centerX + (Math.cos(angle) * (tableWidth / 2 + spacing + chairSize / 2)) - (chairSize / 2);

                chairs.push(<Chair keyVal={`c-${i}`} style={{ top, left }} />);
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
                // Center of container
                const centerX = (tableWidth + 40) / 2;
                const centerY = (tableHeight + 40) / 2;

                // Adjust for container padding if logic needs it, but we are absolute positioning relative to the wrapper
                // Wrapper width = tableWidth + 40 (padding 20 each side roughly)
                // Let's assume standard positioning relative to the wrapper View 

                // Using pure math relative to table center
                const tW = tableWidth; // 80 or 120
                const tH = tableHeight; // 80

                // Top
                if (side === 'top') {
                    const step = tW / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(<Chair keyVal={`t-${i}`} style={{
                            top: -chairSize - spacing,
                            left: (step * i) - (chairSize / 2)
                        }} />);
                    }
                }
                // Bottom
                if (side === 'bottom') {
                    const step = tW / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(<Chair keyVal={`b-${i}`} style={{
                            bottom: -chairSize - spacing,
                            left: (step * i) - (chairSize / 2)
                        }} />);
                    }
                }
                // Left
                if (side === 'left') {
                    const step = tH / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(<Chair keyVal={`l-${i}`} style={{
                            left: -chairSize - spacing,
                            top: (step * i) - (chairSize / 2)
                        }} />);
                    }
                }
                // Right
                if (side === 'right') {
                    const step = tH / (count + 1);
                    for (let i = 1; i <= count; i++) {
                        sideChairs.push(<Chair keyVal={`r-${i}`} style={{
                            right: -chairSize - spacing,
                            top: (step * i) - (chairSize / 2)
                        }} />);
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
                <Text style={[styles.tableNumber, { color: status === 'Ocupada' ? '#FFF' : '#3E2723' }]}>
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
    }
});
