import React, { useRef, useState } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import TableGraphic from './TableGraphic';
import { Table } from '../types';

interface DraggableTableProps {
    table: Table;
    onDragEnd: (id: string, x: number, y: number) => void;
    scale?: number;
}

export default function DraggableTable({ table, onDragEnd, scale = 1 }: DraggableTableProps) {
    // Current position
    const pan = useRef(new Animated.ValueXY({ x: table.position_x, y: table.position_y })).current;
    const [isDragging, setIsDragging] = useState(false);

    // Update pan when props change (e.g. initial load or reset)
    // Be careful not to loop. We trust the parent passes initial pos.
    // Actually, animated value is stable. If parent updates, we might need useEffect to setValue.
    // But for this simple editor, parent state updates only on drag end.

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                // Set offset to current value to prevent jumping
                // @ts-ignore
                pan.setOffset({
                    // @ts-ignore
                    x: pan.x._value,
                    // @ts-ignore
                    y: pan.y._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                setIsDragging(false);
                pan.flattenOffset();

                // Get final values
                // @ts-ignore
                const x = pan.x._value;
                // @ts-ignore
                const y = pan.y._value;

                onDragEnd(table.id, x, y);
            }
        })
    ).current;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.draggable,
                {
                    transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: isDragging ? 1.1 : 1 }],
                    opacity: isDragging ? 0.8 : 1,
                    zIndex: isDragging ? 1000 : 1
                }
            ]}
        >
            <TableGraphic
                shape={table.shape}
                seats={table.seats}
                status={table.status === 'Pagamento' ? 'Pagando' : (table.status as any) || 'Livre'}
                size={60} // Fixed size for editor
                tableNumber={table.number}
            />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    draggable: {
        position: 'absolute',
    }
});
