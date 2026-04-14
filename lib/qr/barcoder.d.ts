declare module "barcoder" {
  const barcoder: {
    validate(barcode: string): boolean;
  };
  export default barcoder;
}
