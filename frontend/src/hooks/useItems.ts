import { Items } from "@/types/NirmaanStack/Items";
import { useFrappeGetDocList } from "frappe-react-sdk";

export default function useItems ({category}) {
    const {data: items, isLoading: items_loading, error: items_error} = useFrappeGetDocList<Items>("Items", {
        fields: ["name", "item_name", "category"],
        filters: [["category","=",category]]
    })
    return {items, items_loading, items_error}
}