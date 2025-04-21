// src/components/project/chat/VirtualizedMessageList.tsx
import React, { useRef, useState, UIEvent, useCallback, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChatMessage } from './ChatMessage';
import { ScrollToBottom as ScrollToBottomComponent } from './ScrollToBottom';
import { TypingIndicator } from './TypingIndicator';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { ProjectDiscussionMessage, TypingUsersMap, UserData } from '../types';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFrappeGetDocList } from 'frappe-react-sdk';

interface VirtualizedMessageListProps {
  messages: ProjectDiscussionMessage[];
  typingUsers: TypingUsersMap;
  currentUser: UserData | null; // Pass current user data
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  error: string | null;
  onLoadMore: () => void;
  listHeight?: string; // Allow customizing height e.g., "calc(100% - 50px)"
}

const TYPING_INDICATOR_ESTIMATED_HEIGHT = 30; // Estimate for layout
const MESSAGE_ESTIMATE_SIZE = 70; // Average message height estimate (tune this!)
const LOAD_MORE_THRESHOLD = 250; // Pixels from top to trigger load


export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
    messages,
    typingUsers,
    currentUser,
    isLoading,
    error,
    listHeight = "100%", // Default to full height of its container
    onLoadMore,
    isLoadingMore,
    hasMoreMessages
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const isNearBottomRef = useRef(true); // Track if user is near bottom

    // Keep track of scroll position before new items are prepended
    const previousScrollHeightRef = useRef<number>(0);
    const previousScrollTopRef = useRef<number>(0);

    const typingUserNames = useMemo(() => {
        return Object.values(typingUsers).map(u => u.name).join(', ');
    }, [typingUsers]);


    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        const element = scrollContainerRef.current;
        if (element) {
            element.scrollTo({ top: element.scrollHeight, behavior });
            isNearBottomRef.current = true; // Assume user is at bottom after manual scroll
            setShowScrollButton(false); // Hide button after scrolling
        }
    }, []);


    // Virtualizer setup
    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => MESSAGE_ESTIMATE_SIZE, // Adjust estimate
        overscan: 10, // Increase overscan a bit for smoother scrolling
        measureElement: (el) => {
            const height = el.getBoundingClientRect().height;
            return height + 4; // Account for padding-bottom
          },
        
    });

    

    const virtualItems = virtualizer.getVirtualItems();
    const totalVirtualHeight = virtualizer.getTotalSize();


    // // Effect to scroll down when new messages arrive IF user was already near the bottom
    useEffect(() => {
        if (messages.length > 0 && isNearBottomRef.current) {
            // Use timeout to ensure DOM updates and virtualization calculations complete
            const timer = setTimeout(() => {
                 scrollToBottom('smooth');
            }, 50); // Small delay
            return () => clearTimeout(timer);
        }
    }, [messages.length, scrollToBottom]); // Depend on message count


    // *** NEW: Effect to maintain scroll position when loading *older* messages ***
    useEffect(() => {
        const scrollElement = scrollContainerRef.current;
        if (!scrollElement || isLoadingMore) {
            // Don't adjust scroll while loading more, wait for items to render
            return;
        }
  
        // After loading more and new items are potentially rendered:
        // Calculate the height difference caused by prepended items
        const currentScrollHeight = scrollElement.scrollHeight;
        const heightDifference = currentScrollHeight - previousScrollHeightRef.current;
  
        if (heightDifference > 0 && previousScrollTopRef.current === 0) {
           // If user was scrolled near the top AND new items were added, adjust scroll
            // console.log(`[VList] Adjusting scroll by ${heightDifference}px`);
            scrollElement.scrollTop = heightDifference;
        }
  
        // Update refs for the next comparison *after* potential adjustment
        // This might need slight delay if render isn't immediate
         requestAnimationFrame(() => {
             if (scrollContainerRef.current) { // Check ref again inside animation frame
                 previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
                 previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
             }
         });
  
      // Run this effect when messages array changes *AND* loading is finished
      }, [messages, isLoadingMore]); // Depend on messages AND isLoadingMore status
  

    // Handle scroll events
    const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const isNearBottom = distanceFromBottom < 150; // Threshold to consider "near bottom"
        isNearBottomRef.current = isNearBottom; // Update ref

        // Update scroll button visibility state only if it changes
        setShowScrollButton(prev => (prev === !isNearBottom ? prev : !isNearBottom));

        // Update previous scroll refs on *every* scroll event
        previousScrollHeightRef.current = scrollHeight;
        previousScrollTopRef.current = scrollTop;

        // // Optional: Infinite scroll trigger
        // if (scrollTop < 200 && !isLoading && onScrollNearTop) { // Threshold near top
        //     // console.log("Near top, potentially load more...");
        //     onScrollNearTop();
        // }

        // Trigger load more when near the top
        if (scrollTop < LOAD_MORE_THRESHOLD && !isLoadingMore && hasMoreMessages) {
            console.log("[VList] Near top, calling onLoadMore...");
            // Store scroll state *before* triggering load more
            // (Refs already updated above)
            onLoadMore();
       }
    }, [isLoadingMore, hasMoreMessages, onLoadMore]);

    return (
        <div className="relative h-full flex flex-col"> {/* Ensure flex container */}

        {/* *** NEW: Loading Indicator / Load More Button at the Top *** */}
        <div className="text-center py-2 shrink-0">
                 {isLoadingMore && (
                     <Loader2 className="h-5 w-5 animate-spin inline-block text-muted-foreground" />
                 )}
                 {!isLoadingMore && hasMoreMessages && !isLoading && (
                     <Button variant="link" size="sm" onClick={onLoadMore}>
                         Load Previous Messages
                     </Button>
                 )}
                  {!isLoading && !hasMoreMessages && messages.length > 0 && (
                      <span className="text-xs text-muted-foreground">Beginning of conversation</span>
                  )}
            </div>
            {/* Scrollable Message Area */}
            <div
                ref={scrollContainerRef}
                className="flex-grow overflow-auto p-4 pr-6" // Added right padding for scrollbar space
                onScroll={handleScroll}
                style={{ height: listHeight }} // Apply dynamic height
            >
                {/* Virtualizer Container */}
                <div
                    style={{
                        height: `${totalVirtualHeight}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {/* Loading Skeletons */}
                    {isLoading && !virtualItems.length && (
                        <div className="absolute inset-0 p-4 space-y-4">
                            <Skeleton className="h-16 w-3/4" />
                            <Skeleton className="h-12 w-1/2 self-end" />
                            <Skeleton className="h-16 w-2/3" />
                        </div>
                    )}

                     {/* Error Message */}
                     {!isLoading && error && (
                         <div className="absolute inset-0 flex items-center justify-center p-4">
                            <p className="text-red-500 text-center">{error}</p>
                         </div>
                    )}

                    {/* Rendered Virtual Items */}
                    {!isLoading && virtualItems.map((virtualItem) => {
                        const message = messages[virtualItem.index];
                        if (!message) return null; // Safety check
                        const isCurrentUser = message.owner === currentUser?.user_id;
                        return (
                            <div
                                key={message.name}
                                data-index={virtualItem.index} // For debugging
                                ref={virtualizer.measureElement} // Measure element size
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                    paddingBottom: '4px' // Add small bottom padding between virtual items
                                }}
                            >
                                <ChatMessage message={message} isCurrentUser={isCurrentUser} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Typing Indicator (Fixed at bottom of scrollable area) */}
            {typingUserNames && (
                 <div
                    className="px-4 pb-1 pt-1 h-[24px] text-xs text-muted-foreground italic truncate flex items-center gap-2 shrink-0"
                    style={{ height: `${TYPING_INDICATOR_ESTIMATED_HEIGHT}px`}}
                 >
                     <TypingIndicator />
                     {typingUserNames} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
                 </div>
            )}

             {/* Scroll to Bottom Button (Positioned relative to outer container) */}
             {showScrollButton && (
                <div className="absolute bottom-4 right-4 z-10">
                    <ScrollToBottomComponent onClick={() => scrollToBottom()} />
                </div>
            )}
        </div>
    );
};