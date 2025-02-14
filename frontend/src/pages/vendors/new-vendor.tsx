import { zodResolver } from "@hookform/resolvers/zod"
import { useFrappeCreateDoc, useFrappeDeleteDoc, useFrappeGetDoc, useFrappeGetDocList, useSWRConfig } from "frappe-react-sdk"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ButtonLoading } from "@/components/ui/button-loading"
import ReactSelect from 'react-select';
import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, ListChecks, ListRestart, Undo2 } from "lucide-react"
import { SheetClose } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getVendorFormSchema = (service: boolean) => {
    return z.object({
        vendor_contact_person_name: z
            .string()
            .optional(),
        vendor_name: z
            .string({
                required_error: "Must provide Vendor Name"
            })
            .min(3, {
                message: "Must be at least 3 characters.",
            }),
        address_line_1: z
            .string({
                required_error: "Address Line 1 Required"
            }).min(1, {
                message: "Address Line 1 Required"
            }),
        address_line_2: z
            .string({
                required_error: "Address Line 2 Required"
            }).min(1, {
                message: "Address Line 2 Required"
            }),
        vendor_city: z
            .string({
                required_error: "Must Provide City"
            })
            .min(1, {
                message: "Must Provide City"
            }),
        vendor_state: z
            .string({
                required_error: "Must Provide State"
            })
            .min(1, {
                message: "Must Provide State"
            }),
        pin: z
            .string({
                required_error: "Must provide pincode"
            })
            .max(6, { message: "Pincode must be of 6 digits" })
            .min(6, { message: "Pincode must be of 6 digits" }),
        vendor_email: z
            .string()
            .email()
            .optional(),
        vendor_mobile: z
            .string({
                required_error: "Must provide contact"
            })
            .max(10, { message: "Mobile number must be of 10 digits" })
            .min(10, { message: "Mobile number must be of 10 digits" })
            .optional(),
        // vendor_gst: z
        //     .string({
        //         required_error: "Vendor GST Required"
        //     })
        //     .min(1, {
        //         message: "Vendor GST Required"
        //     })
        //     .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, {
        //         message: "Invalid GST format. Example: 22AAAAA0000A1Z5"
        //     }),
        vendor_gst: service
            ? z.string()
                .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, {
                    message: "Invalid GST format. Example: 22AAAAA0000A1Z5",
                }).optional()
            : z.string()
                .min(1, { message: "Vendor GST Required" })
                .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/, {
                    message: "Invalid GST format. Example: 22AAAAA0000A1Z5",
                }),
    })
};

type VendorFormValues = z.infer<ReturnType<typeof getVendorFormSchema>>;

interface SelectOption {
    label: string;
    value: string;
}

export const NewVendor = ({ dynamicCategories = [], navigation = true, renderCategorySelection = true, sentBackData = undefined, prData = undefined, service = false }) => {

    const navigate = useNavigate()
    const [vendorType, setVendorType] = useState(null)
    const VendorFormSchema = getVendorFormSchema(vendorType === "Service");
    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema),
        defaultValues: {},
        mode: "onBlur",
    })

    const { data: category_list, isLoading: category_list_loading, error: category_list_error } = useFrappeGetDocList("Category",
        {
            fields: ["*"],
            filters: [["work_package", "!=", "Services"]],
            orderBy: { field: 'work_package', order: 'asc' },
            limit: 10000
        },
        "Category"
    );

    const { mutate } = useSWRConfig()
    const { toast } = useToast()
    const { createDoc: createDoc, loading: loading, isCompleted: submit_complete, error: submit_error } = useFrappeCreateDoc()
    const { deleteDoc } = useFrappeDeleteDoc()

    const [categories, setCategories] = useState<SelectOption[]>([])

    const category_options: SelectOption[] = (dynamicCategories.length ? dynamicCategories : category_list)
        ?.map(item => ({
            label: `${!dynamicCategories.length ? `${item.category_name}-(${item.work_package})` : item.category_name}`,
            value: item.category_name
        })) || [];

    const handleChange = (selectedOptions: SelectOption[]) => {
        setCategories(selectedOptions)
    }

    const closewindow = () => {
        const button = document.getElementById('sheetClose');
        button?.click();
    };

    const resetForm = () => {
        form.reset({
            vendor_contact_person_name: undefined,
            vendor_name: undefined,
            address_line_1: undefined,
            address_line_2: undefined,
            vendor_city: undefined,
            vendor_state: undefined,
            pin: undefined,
            vendor_email: undefined,
            vendor_mobile: undefined,
            vendor_gst: undefined,
        });
        setCategories([]);
        form.clearErrors();
        document.getElementById("vendorShopName")?.focus()
    }

    const onSubmit = async (values: VendorFormValues) => {

        try {
            if (values.vendor_city === "Not Found" || values.vendor_state === "Not Found") {
                throw new Error('City and State are "Note Found", Please Enter a Valid Pincode')
            }

            let category_json = categories.map((cat) => cat["value"]);

            const service_categories = ["Electrical Services", "HVAC Services", "Data & Networking Services", "Fire Fighting Services", "FA Services", "PA Services", "Access Control Services", "CCTV Services", "Painting Services", "Carpentry Services", "POP Services"]
            // Create the address document
            const addressDoc = await createDoc('Address', {
                address_title: values.vendor_name,
                address_type: "Shop",
                address_line1: values.address_line_1,
                address_line2: values.address_line_2,
                city: values.vendor_city,
                state: values.vendor_state,
                country: "India",
                pincode: values.pin,
                email_id: values.vendor_email,
                phone: values.vendor_mobile,
            });

            try {
                // Create the vendor document using the address document reference
                const vendorDoc = await createDoc('Vendors', {
                    vendor_name: values.vendor_name,
                    vendor_type: vendorType,
                    vendor_address: addressDoc.name,
                    vendor_city: addressDoc.city,
                    vendor_state: addressDoc.state,
                    vendor_contact_person_name: values.vendor_contact_person_name,
                    vendor_mobile: values.vendor_mobile,
                    vendor_email: values.vendor_email,
                    vendor_gst: values.vendor_gst,
                    vendor_category: vendorType === "Service" ? { categories: service_categories }
                        :
                        vendorType === "Material" ?
                        {
                            categories: (!renderCategorySelection && dynamicCategories.length)
                                ? dynamicCategories
                                : category_json
                        } :
                        {
                            categories : (!renderCategorySelection && dynamicCategories.length)
                                ? [...dynamicCategories, ...service_categories]
                                : [...category_json, ...service_categories]
                        }
                });

                // Create quotation requests
                const promises = [];
                if (sentBackData) {
                    sentBackData?.item_list?.list.forEach((item) => {
                        const makes = sentBackData?.category_list?.list?.find(i => i?.name === item?.category)?.makes?.map(j => ({ make: j, enabled: "false" })) || [];
                        const newItem = {
                            procurement_task: sentBackData.procurement_request,
                            category: item.category,
                            item: item.name,
                            vendor: vendorDoc.name,
                            quantity: item.quantity,
                            makes: { list: makes || [] }
                        };
                        promises.push(createDoc("Quotation Requests", newItem));
                    });
                } else if (prData) {
                    prData?.procurement_list?.list.forEach((item) => {
                        const makes = prData?.category_list?.list?.find(i => i?.name === item?.category)?.makes?.map(j => ({ make: j, enabled: "false" })) || [];
                        const newItem = {
                            procurement_task: prData.name,
                            category: item.category,
                            item: item.name,
                            vendor: vendorDoc.name,
                            quantity: item.quantity,
                            makes: { list: makes || [] }
                        };
                        promises.push(createDoc("Quotation Requests", newItem));
                    });
                }

                await Promise.all(promises);

                // Mutate the vendor-related data
                if (service) {
                    await mutate("Service Vendors");
                } else {
                    await mutate("Material Vendors");
                }
                await mutate("Quotation Requests");
                if (prData) {
                    await mutate(`Quotations Requests,Procurement_task=${prData?.name}`)
                }
                await mutate("Vendor Category");

                toast({
                    title: "Success!",
                    description: "Vendor Created Successfully!",
                    variant: "success"
                });

                // Navigate or close window
                if (navigation) {
                    navigate("/vendors");
                } else {
                    closewindow();
                }
            } catch (vendorError) {
                // Delete the address document if vendor creation fails
                await deleteDoc('Address', addressDoc.name);
                throw vendorError;
            }
        } catch (error) {
            if (error?.exc_type === "VendorGSTExistError") {
                toast({
                    title: "Duplicate Value Error!",
                    description: `Vendor with this GST already exists!`,
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "Failed!",
                    description: `${error?.exception}`,
                    variant: "destructive"
                });
            }
            console.error("Submit Error", error);
        }
    };


    const [pincode, setPincode] = useState("")

    const { data: pincode_data, isLoading: pincode_loading, error: pincode_error } = useFrappeGetDoc("Pincodes", pincode)
    // const { city, state } = usePincode(pincode)

    const debouncedFetch = useCallback(
        (value: string) => {
            if (value.length >= 6) {
                setPincode(value)
            } else {
                setPincode("")
            }
        }, []
    )

    useEffect(() => {
        if (service) {
            setVendorType("Service")
        } else {
            setVendorType("Material")
        }
    }, [service])

    useEffect(() => {
        if (pincode.length >= 6 && !pincode_data) {
            form.setValue("vendor_city", "Not Found")
            form.setValue("vendor_state", "Not Found")
        } else {
            form.setValue("vendor_city", pincode_data?.city || "")
            form.setValue("vendor_state", pincode_data?.state || "")
        }
    }, [pincode, pincode_data])


    const handlePincodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        debouncedFetch(value)
    }

    return (
        <>
            <div className={`flex-1 space-x-2 ${navigation ? "flex-1 md:space-y-4" : ""} `}>
                {navigation && (
                    <p className="text-muted-foreground max-md:ml-4 ml-8">
                        Fill all the marked fields to create a new Vendor
                    </p>
                )}

                <div className="flex flex-col items-start mt-2 px-6 max-md:px-2 space-y-2">
                    <label htmlFor="vendorType" className="block text-sm font-medium text-gray-700">Vendor_Type<sup className="text-sm text-red-600">*</sup></label>
                    <Select value={vendorType} onValueChange={(value) => setVendorType(value)} defaultValue={service ? "Service" : "Material"}>
                        <SelectTrigger className="">
                            <SelectValue className="text-gray-200" placeholder="Select Vendor Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {!service && (
                                <SelectItem value="Material">Material</SelectItem>
                            )}
                            {dynamicCategories.length === 0 && (
                                <SelectItem value="Service">Service</SelectItem>
                            )}
                            <SelectItem value="Material & Service">Material & Service</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {vendorType && (
                    <>
                        <Separator className="my-6 max-md:my-2" />
                        <Form {...form}>
                            <form onSubmit={(event) => {
                                event.stopPropagation();
                                return form.handleSubmit(onSubmit)(event);
                            }} className="space-y-8 px-6 max-md:px-2">
                                <FormField
                                    control={form.control}
                                    name="vendor_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">Vendor Shop Name<sup className="text-sm text-red-600">*</sup></FormLabel>
                                            <FormControl>
                                                <Input id="vendorShopName" placeholder="enter shop name..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor_contact_person_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vendor Contact Person Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="enter person name..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="vendor_gst"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">GST Number{vendorType !== "Service" && <sup className="text-sm text-red-600">*</sup>}</FormLabel>
                                            <FormControl>
                                                <Input placeholder="enter gst..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                {(renderCategorySelection && vendorType !== "Service") && (
                                    <>
                                        <div>
                                            <label className="flex items-center">Add Category<sup className="text-sm text-red-600">*</sup></label>
                                            <ReactSelect options={category_options} onChange={handleChange} isMulti />
                                        </div>
                                        <Separator className="my-3" />
                                    </>
                                )}
                                <p className="text-sky-600 font-semibold pb-2">Vendor Address Details</p>
                                <FormField
                                    control={form.control}
                                    name="address_line_1"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">Address Line 1<sup className="text-sm text-red-600">*</sup></FormLabel>
                                            <FormControl>
                                                <Input placeholder="Building name, floor" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="address_line_2"
                                    render={({ field }) => (
                                        <FormItem>

                                            <FormLabel className="flex">Address Line 2<sup className="text-sm text-red-600">*</sup></FormLabel>

                                            <FormControl>
                                                <Input placeholder="Street name, area, landmark" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor_city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">City<sup className="text-sm text-red-600">*</sup></FormLabel>
                                            <FormControl>
                                                <Input placeholder={pincode_data?.city ? pincode_data?.city : "City"} disabled={true} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor_state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">State<sup className="text-sm text-red-600">*</sup></FormLabel>
                                            <FormControl>
                                                <Input placeholder={pincode_data?.state ? pincode_data?.state : "State"} disabled={true} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>

                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="pin"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">Pin Code<sup className="text-sm text-red-600">*</sup></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="6 digit PIN"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e)
                                                        handlePincodeChange(e)
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor_mobile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex">Phone</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Contact No" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="vendor_email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter Email ID" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex space-x-2 items-center justify-end">
                                    {(loading) ? (<ButtonLoading />) : (
                                        <>
                                            <Button type="button" variant="secondary" className="flex items-center gap-1" onClick={() => resetForm()}>
                                                <ListRestart className="h-4 w-4" />
                                                Reset</Button>
                                            <Button type="submit" className="flex items-center gap-1">
                                                <ListChecks className="h-4 w-4" />
                                                Submit</Button>
                                        </>
                                    )}
                                </div>
                                {!navigation && (
                                    <SheetClose asChild><Button id="sheetClose" className="w-0 h-0 invisible"></Button></SheetClose>
                                )}
                            </form>
                        </Form>
                    </>
                )}
            </div>
        </>
    )
}