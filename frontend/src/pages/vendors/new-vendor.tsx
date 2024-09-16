import { zodResolver } from "@hookform/resolvers/zod"
import { useFrappeCreateDoc, useFrappeDeleteDoc, useFrappeGetDocList, useSWRConfig } from "frappe-react-sdk"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ButtonLoading } from "@/components/button-loading"
import ReactSelect from 'react-select';
import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { SheetClose } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import { usePincode } from "@/hooks/usePincode"


const VendorFormSchema = z.object({
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
        .string()
        .optional(),
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
    vendor_gst: z
        .string({
            required_error: "Vendor GST Required"
        })
        .min(1, {
            message: "Vendor GST Required"
        }),
    // vendor_categories: z
    //     .array(z.string())
})

type VendorFormValues = z.infer<typeof VendorFormSchema>

interface SelectOption {
    label: string;
    value: string;
}

export const NewVendor = ({ dynamicCategories = [], navigation = true, renderCategorySelection = true, sentBackData = undefined }) => {
    const navigate = useNavigate()
    const form = useForm<VendorFormValues>({
        resolver: zodResolver(VendorFormSchema),
        defaultValues: {}
        ,
        mode: "onBlur",
    })

    const { data: category_list, isLoading: category_list_loading, error: category_list_error } = useFrappeGetDocList("Category",
        {
            fields: ["*"],
            orderBy: { field: 'work_package', order: 'asc' },
            limit: 1000
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
            vendor_contact_person_name: "",
            vendor_name: "",
            address_line_1: "",
            address_line_2: "",
            vendor_city: "",
            vendor_state: "",
            pin: "",
            vendor_email: "",
            vendor_mobile: "",
            vendor_gst: "",
        });
        setCategories([]);
        form.clearErrors();
    }


    // const onSubmit = async (values: VendorFormValues) => {
    //     let category_json = categories.map((cat) => cat["value"])

    //     try {
    //         const addressDoc = await createDoc('Address', {
    //             address_title: values.vendor_name,
    //             address_type: "Shop",
    //             address_line1: values.address_line_1,
    //             address_line2: values.address_line_2,
    //             city: values.vendor_city,
    //             state: values.vendor_state,
    //             country: "India",
    //             pincode: values.pin,
    //             email_id: values.vendor_email,
    //             phone: values.vendor_mobile,
    //         })

    //         const vendorDoc = await createDoc('Vendors', {
    //             vendor_name: values.vendor_name,
    //             vendor_type: "Material",
    //             vendor_address: addressDoc.name,
    //             vendor_city: addressDoc.city,
    //             vendor_state: addressDoc.state,
    //             vendor_contact_person_name: values.vendor_contact_person_name,
    //             vendor_mobile: values.vendor_mobile,
    //             vendor_email: values.vendor_email,
    //             vendor_gst: values.vendor_gst,
    //             vendor_category: { "categories": (!renderCategorySelection && dynamicCategories.length) ? dynamicCategories : category_json }
    //         })
    //         const promises = []
    //         sentBackData && sentBackData.item_list?.list.map((item) => {
    //             const newItem = {
    //                 procurement_task: sentBackData.procurement_request,
    //                 category: item.category,
    //                 item: item.name,
    //                 vendor: vendorDoc.name,
    //                 quantity: item.quantity
    //             }
    //             promises.push(createDoc("Quotation Requests", newItem))
    //         })

    //         await Promise.all(promises)
    //         await mutate("Vendors")
    //         await mutate("Quotation Requests")
    //         await mutate("Vendor Category")

    //         toast({
    //             title: "Success!",
    //             description: "Vendor Created Successfully!",
    //             variant: "success"
    //         })

    //         if (navigation) {
    //             navigate("/vendors")
    //         } else {
    //             closewindow()
    //         }
    //     } catch (error) {
    //         toast({
    //             title: "Failed!",
    //             description: `${error?.message}`,
    //             variant: "destructive"
    //         })
    //         console.error("Submit Error", error)
    //     }
    // }

    const onSubmit = async (values: VendorFormValues) => {
        let category_json = categories.map((cat) => cat["value"]);
    
        try {
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
                    vendor_type: "Material",
                    vendor_address: addressDoc.name,
                    vendor_city: addressDoc.city,
                    vendor_state: addressDoc.state,
                    vendor_contact_person_name: values.vendor_contact_person_name,
                    vendor_mobile: values.vendor_mobile,
                    vendor_email: values.vendor_email,
                    vendor_gst: values.vendor_gst,
                    vendor_category: {
                        categories: (!renderCategorySelection && dynamicCategories.length)
                            ? dynamicCategories
                            : category_json
                    }
                });
    
                // Create quotation requests
                const promises = [];
                sentBackData?.item_list?.list.forEach((item) => {
                    const newItem = {
                        procurement_task: sentBackData.procurement_request,
                        category: item.category,
                        item: item.name,
                        vendor: vendorDoc.name,
                        quantity: item.quantity
                    };
                    promises.push(createDoc("Quotation Requests", newItem));
                });
    
                await Promise.all(promises);
    
                // Mutate the vendor-related data
                await mutate("Vendors");
                await mutate("Quotation Requests");
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
            toast({
                title: "Failed!",
                description: `${error?.message}`,
                variant: "destructive"
            });
            console.error("Submit Error", error);
        }
    };
    

    const [pincode, setPincode] = useState("")
    const { city, state } = usePincode(pincode)

    const debouncedFetch = useCallback(
        (value: string) => {
            if (value.length === 6) {
                setPincode(value)
            }
        }, []
    )

    const handlePincodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        debouncedFetch(value)
    }

    useEffect(() => {
        if (pincode.length === 6) {
            form.setValue("vendor_city", city || "")
            form.setValue("vendor_state", state || "")
        }
    }, [city, state, form])

    return (
        <div className={`flex-1 space-x-2 ${navigation ? " md:space-y-4 p-4 md:p-8 pt-6" : ""} `}>
            {navigation && (
                <div className="flex gap-1">
                    <Link to="/vendors"><ArrowLeft className="mt-1.5" /></Link>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Add Vendor</h2>
                        <p className="text-muted-foreground">
                            Fill out to create a new Vendor
                        </p>
                    </div>
                </div>
            )}

            <Separator className="my-6" />
            <Form {...form}>
                <form onSubmit={(event) => {
                    event.stopPropagation();
                    return form.handleSubmit(onSubmit)(event);
                }} className="space-y-8">
                    <FormField
                        control={form.control}
                        name="vendor_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex">Vendor Shop Name<sup className="text-sm text-red-600">*</sup></FormLabel>
                                <FormControl>
                                    <Input placeholder="enter shop name..." {...field} />
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
                                <FormLabel className="flex">GST Number<sup className="text-sm text-red-600">*</sup></FormLabel>
                                <FormControl>
                                    <Input placeholder="enter gst..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                    {renderCategorySelection && (
                        <div>
                            <label className="flex items-center">Add Category<sup className="text-sm text-red-600">*</sup></label>
                            <ReactSelect options={category_options} onChange={handleChange} isMulti />
                        </div>
                    )}
                    <Separator className="my-3" />
                    <p className="text-sky-600 font-semibold pb-2">Vendor Address Details</p>
                    <FormField
                        control={form.control}
                        name="address_line_1"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex">Address Line 1: <sup className="text-sm text-red-600">*</sup></FormLabel>
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
                                <FormLabel className="flex">Address Line 2:</FormLabel>
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
                                <FormLabel className="flex">City: <sup className="text-sm text-red-600">*</sup></FormLabel>
                                <FormControl>
                                    <Input placeholder={city || "City"} disabled={true} {...field} />
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
                                <FormLabel className="flex">State: <sup className="text-sm text-red-600">*</sup></FormLabel>
                                <FormControl>
                                    <Input placeholder={state || "State"} disabled={true} {...field} />
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
                                <FormLabel className="flex">Pin Code:</FormLabel>
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
                                <FormLabel className="flex">Phone: <sup className="text-sm text-red-600">*</sup></FormLabel>
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
                                <FormLabel>Email: </FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter Email ID" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {(loading) ? (<ButtonLoading />) : (

                        <div className="flex space-x-2 items-center justify-end">
                            <Button type="button" variant="outline" onClick={() => resetForm()}>Reset</Button>
                            <Button type="submit" >Submit</Button>
                        </div>

                    )}
                    {!navigation && (
                        <SheetClose asChild><Button id="sheetClose" className="w-0 h-0 invisible"></Button></SheetClose>
                    )}
                </form>
            </Form>
        </div>
    )
}