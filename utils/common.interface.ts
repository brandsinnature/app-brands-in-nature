import { JwtPayload } from "jwt-decode";

export interface CompleteProduct {
    brand: string;
    name: string;
    description: string;
    derived_description: string;
    gtin: string;
    caution: string;
    sku_code: string;
    category: string;
    sub_category: string;
    gpc_code: string;
    marketing_info: string;
    url: string;
    activation_date: string;
    deactivation_date: string;
    country_of_origin: string;
    created_date: string;
    modified_date: string;
    type: string;
    packaging_type: string;
    primary_gtin: string;
    published: string;
    images: {
        front: string;
        back: string;
        top: string;
        bottom: string;
        left: string;
        right: string;
        top_left: string;
        top_right: string;
    };
    company_detail: {
        name: string;
    };
    weights_and_measures: {
        measurement_unit: string;
        mass_measurement_unit: string;
        net_weight: string;
        gross_weight: string;
        net_content: string;
    };
    dimensions: {
        measurement_unit: string;
        height: string;
        width: string;
        depth: string;
    };
    case_configuration: any[];
    mrp: any[];
    hs_code: string;
    igst: string;
    cgst: string;
    sgst: string;
    margin: any[];
    attributes: {
        nutritional_information: string;
        nutritional_information_image: string;
        ingredients: string;
        ingredients_image: string;
        ean_image: string;
        storage_condition: string;
        regulatory_data: {
            child: {
                "fssai_lic._no.": string;
                fssai_description: string;
                fssai_image: string;
                "isi_no.": string;
                agmark_ca_number: string;
                agmark_ca_number_validity_period: string;
                organic: string;
                organic_certificate: string;
            };
        };
        food_type: string;
        shelf_life: {
            child: {
                value: string;
                unit: string;
                based_on: string;
                shelf_life_image: string;
            };
        };
        health_benefit: string;
        allergen_information: string;
        gluten_free: string;
        lactose_free: string;
        alcohol_free: string;
        vegan: string;
        pre_cooked: string;
        dairy_suppliment: string;
        "caution/warning": string;
        "direction/how_to_use": string;
        "direction/how_to_use_image": string;
        imported_product: string;
        "importer/packer_name_&_address": string;
        product_flavour: string;
        artificial_flavour: string;
        added_flavors: string;
        added_preservatives: string;
        added_fruit: string;
        added_colours: string;
        artificial_colours: string;
        form: string;
        sachet_article: string;
        speciality: string;
        oil_extraction: string;
        microwaveable: string;
        product_packaging: {
            child: {
                conveyable: string;
                crush_factor_for_carton: string;
                recyclable_packaging: string;
                "bio-degradable_packaging": string;
                packing_material_internal: string;
                packing_material_external: string;
                rigidity_of_packing: string;
            };
        };
        seo_keywords: string;
        product_on_recall: string;
        batch_number: string;
        product_data_management: {
            child: {
                brick_code: string;
                merchandising_code: string;
                base_cost: string;
                margin: string;
                purchase_group: string;
                "supplier_name/code": string;
                "grn_shelf_%": string;
                "dispatch_shelf_%": string;
                pick_lead_time: string;
                lead_time_supplier: string;
                location_store_code: string;
                article_mrp_type: string;
            };
        };
    };
    additional_attributes: any[];
}

export interface IProduct {
    id: string;
    brand: string | null;
    name: string | null;
    gtin: string | null;
    category: string | null;
    sub_category: string | null;
    description: string | null;
    country_of_origin: string | null;
    images: {
        front: string;
    };
    weights_and_measures: {
        net_weight: string | null;
        measurement_unit: string | null;
    };
}

export interface ProductDimensions {
    id: string;
    product_id: string;
    measurement_unit: string | null;
    net_weight: number | null;
    gross_weight: number | null;
    net_content: number | null;
    height: number | null;
    width: number | null;
    depth: number | null;
}

// done
export interface ProductImages {
    id: string;
    product_id: string;
    front: string | null;
    back: string | null;
    top: string | null;
    bottom: string | null;
    left: string | null;
    right: string | null;
}

export interface EnvironmentalData {
    id: string;
    product_id: string;
    recyclable_packaging: boolean | null;
    bio_degradable_packaging: boolean | null;
    shelf_life_value: number | null;
    shelf_life_unit: string | null;
    storage_condition: string | null;
}

export interface RegulatoryData {
    id: string;
    product_id: string;
    fssai_license_no: string | null;
    allergen_information: string | null;
    vegan: boolean | null;
    gluten_free: boolean | null;
    lactose_free: boolean | null;
    alcohol_free: boolean | null;
}

export interface TaxData {
    id: string;
    product_id: string;
    igst: number | null;
    cgst: number | null;
    sgst: number | null;
    margin: number | null;
}

export interface SupplierData {
    id: string;
    product_id: string;
    manufacturer_name: string | null;
    importer_name: string | null;
    manufacturer_address: string | null;
    importer_address: string | null;
}

export interface ProductAttributes {
    id: string;
    product_id: string;
    material_composition: string | null;
    recycling_instructions: string | null;
    disposal_methods: string | null;
}

export interface IJwtPayload extends JwtPayload {}

export interface IReturn {
    latitude: number;
    longitude: number;
    accuracy: number;
    pa: string;
    pn: string;
    buyId: string;
}

export interface ICart {
    id: string;
    product_id: string;
    created_at: string;
    quantity: number;
    product: Pick<
        IProduct,
        "gtin" | "brand" | "name" | "images" | "description"
    >;
}
