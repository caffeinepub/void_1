// Type shim for qrcode — used in InviteModal for QR code generation
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  function toSvgString(text: string, options?: QRCodeToDataURLOptions): Promise<string>;

  const _default: {
    toDataURL: typeof toDataURL;
    toSvgString: typeof toSvgString;
  };
  export default _default;
  export { toDataURL, toSvgString };
}
