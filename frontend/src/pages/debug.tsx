import ImageCrop from "@/components/image-dialog";
import { Button } from "@/components/ui/button";
import { useFrappeFileUpload, useFrappeGetDocList, useFrappeUpdateDoc } from "frappe-react-sdk"
import { useEffect, useState } from "react";
import { Link } from "react-router-dom"
import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTrigger } from '@/components/ui/dialog'
import { DialogHeader } from '@/components/ui/dialog'
import useItems from "@/hooks/useItems";
import { Category } from "@/types/NirmaanStack/Category";


// PICTURE CROP USING reac-easy-crop
// export default function Debug() {
//     const { upload: upload_img, loading: upload_loading, error: upload_error, reset: upload_reset } = useFrappeFileUpload()
//     const { updateDoc: update, loading: update_loading, error: update_error } = useFrappeUpdateDoc()
//     const [selectedFile, setSelectedFile] = useState(null)
//     const [croppedImage, setCroppedImage] = useState(null)
//     const [preview, setPreview] = useState(); //Your File Preview

//     const fileArgs = {
//         /** If the file access is private then set to TRUE (optional) */
//         "isPrivate": true,
//         /** Folder the file exists in (optional) */
//         "folder": "Home",
//         /** Doctype associated with the file (optional) */
//         "doctype": "Items",
//         /** Docname associated with the file (mandatory if doctype is present) */
//         "docname": "ITEM-000006",
//         /** Field to be linked in the Document **/
//         "fieldname": "image_url"
//     }
//     function handleFileChange(e) {
//         console.log(e.target.files);

//         if (e.target.files && e.target.files.length > 0) {
//             setSelectedFile(e.target.files[0])
//             setPreview(URL.createObjectURL(e.target.files[0]));
//         }
//     }

//     const handleCroppedImage = (croppedImage) => {
//         setCroppedImage(croppedImage)
//         console.log(croppedImage)
//     }

//     const handleReset = () => {
//         setSelectedFile(null)
//         setCroppedImage(null)
//     }

//     function saveImage() {
//         let cropped_file = new File([croppedImage], "cropped.png", { type: "image/png" })
//         upload_img(
//             cropped_file,
//             fileArgs,
//             'frappe.handler.upload_file'
//         )
//             .then((doc) => update('Items', "ITEM-000006", {
//                 image_url: doc.file_url,
//             }))
//             .catch(e => console.error(e))

//     }


//     return (
//         <>
//             <h2>Add Image:</h2>
//             <div>
//                 {croppedImage ? (
//                     <div>
//                         <img src={croppedImage} alt="Cropped" />
//                         <Button onClick={handleReset} color="secondary">
//                             Crop Another Image
//                         </Button>
//                         <Button onClick={saveImage}>Save</Button>
//                     </div>
//                 ) : (
//                     <div>
//                         <input type="file" onChange={handleFileChange} accept="image/*" />
//                         {selectedFile ? (
//                             <Dialog>
//                                 <DialogTrigger asChild>
//                                     <Button>Edit Image</Button>
//                                 </DialogTrigger>
//                                 <DialogContent className="dialogContent">
//                                     <DialogHeader>
//                                         <ImageCrop imageFile={selectedFile} onCroppedImage={handleCroppedImage} />
//                                     </DialogHeader>
//                                 </DialogContent>
//                             </Dialog>
//                         ) : <></>}
//                     </div>
//                 )}
//             </div>
//             {/* <input type="file" onChange={handleChange} />
//             <img src={preview} />
//             <button onClick={saveImage}>Save</button> */}
//             {/* {user_error && <h1>ERROR</h1>}
//             {user_loading ? <p>Loading</p> : user_data?.map(item => <><Link key={item.name + "_l"} to="/debug">{item.name}</Link><br /><DebugRoles key={item.name} user={item.name} /></>)} */}
//         </>
//     )
// }

// function DebugRoles(props: { user: string }) {
//     const { data: role_data, isLoading: role_loading, error: role_error } = useFrappeGetDocList("Has Role", {
//         filters: [["parent", "=", props.user]]
//     })

//     return (
//         <>
//             {role_error && <h1>ERROR</h1>}
//             {role_loading ? <p>Loading</p> : role_data?.map(item => <p>{item.name}</p>)}
//         </>
//     )
// }

export default function Debug() {

    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function getItems() {
            const { data: categories, isLoading: categories_loading, error: categories_error } = await useFrappeGetDocList<Category>("Category", {
                fields: ["name", "category_name"],
            })
            if (categories && categories.length > 0) {
                console.log(categories)
                try {
                    setLoading(true);
                    const allItems = [];

                    for (const category of Object.entries(categories)) {
                        const { items: categoryItems, items_loading: isLoading, items_error: error } = useItems(category.name);
                        if (error) throw error;
                        if (!isLoading && categoryItems) {
                            console.log(items)
                            allItems.push(Object.values(items).item_name);
                        }
                    }

                    setItems(allItems);
                    setLoading(false);
                } catch (err) {
                    console.log(err.message)
                    setError(err);
                    setLoading(false);
                }
            }
        }

        getItems();
    }, [categories]);

    if (categories_loading || loading) return <h1>LOADING</h1>;
    if (categories_error || error) return <h1>ERROR</h1>;

    return (
        <div>
            {items.map((item, index) => (
                <h1 key={index}>{item.item_name}</h1>
            ))}
        </div>
    );
}