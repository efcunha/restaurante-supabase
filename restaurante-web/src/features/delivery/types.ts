export interface DeliveryOrderFormProps {
  clientName: string;
  onChangeClientName: (value: string) => void;
  customerPhone: string;
  onChangeCustomerPhone: (value: string) => void;
  deliveryCep: string;
  onChangeDeliveryCep: (value: string) => void;
  isSearchingCep: boolean;
  deliveryAddress: string;
  onChangeDeliveryAddress: (value: string) => void;
  deliveryFee: string;
  onChangeDeliveryFee: (value: string) => void;
  paymentMethod: string;
  onChangePaymentMethod: (value: string) => void;
  changeFor: string;
  onChangeChangeFor: (value: string) => void;
}

export interface DeliverySubmitFooterProps {
  finalTotal: number;
  onSubmit: () => void;
  isSubmitting: boolean;
  disabled: boolean;
  onHeightChange?: (height: number) => void;
}
