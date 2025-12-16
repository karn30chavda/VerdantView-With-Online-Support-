"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useExpenses } from "@/hooks/use-expenses";
import {
  Loader2,
  Upload,
  Camera,
  Trash2,
  Calendar as CalendarIcon,
  IndianRupee,
  ImageUp,
  CircleX,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Expense } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

type EditableExpense = Omit<Expense, "id">;

interface ExtractedExpense {
  title: string;
  amount: number;
  date?: string;
  category?: string;
  paymentMode?: "Cash" | "Card" | "Online" | "Other";
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function ExpenseScanner() {
  const { addMultipleExpenses, categories } = useExpenses();
  const router = useRouter();
  const { toast } = useToast();
  const [editableExpenses, setEditableExpenses] = useState<EditableExpense[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const [openDatePickerIndex, setOpenDatePickerIndex] = useState<number | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("upload");
  const [scanMode, setScanMode] = useState("line-items");
  const [isOnline, setIsOnline] = useState(true);
  const [scanUsage, setScanUsage] = useState(0);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (activeTab !== "camera" || !navigator.mediaDevices) {
      setHasCameraPermission(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description:
          "Please enable camera permissions in your browser settings.",
      });
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, startCamera, stopCamera]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetScanState();
  };

  const handleScanModeChange = (value: string) => {
    setScanMode(value);
    resetScanState();
  };

  const resetScanState = () => {
    setEditableExpenses([]);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (activeTab === "camera") {
      startCamera();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setEditableExpenses([]);
      };
      reader.readAsDataURL(file);
    }
  };

  /*
   * DAILY_SCAN_LIMIT: Restrict users to a set number of scans per day
   * to strictly manage API quota usage.
   */
  const DAILY_SCAN_LIMIT = 3;

  const getScanUsage = () => {
    const today = new Date().toISOString().split("T")[0];
    const usage = localStorage.getItem(`scan_usage_${today}`);
    return usage ? parseInt(usage, 10) : 0;
  };

  const incrementScanUsage = () => {
    const today = new Date().toISOString().split("T")[0];
    const usage = getScanUsage();
    localStorage.setItem(`scan_usage_${today}`, (usage + 1).toString());
    setScanUsage(usage + 1);
  };

  useEffect(() => {
    setScanUsage(getScanUsage());
  }, []);

  const handleScanImage = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      toast({
        variant: "destructive",
        title: "Offline",
        description:
          "An internet connection is required to use the AI scanner.",
      });
      return;
    }
    if (!imagePreview) {
      toast({
        variant: "destructive",
        title: "No Image or PDF",
        description: "Please select a document to scan.",
      });
      return;
    }

    const currentUsage = scanUsage; // Use state instead of reading direct
    if (currentUsage >= DAILY_SCAN_LIMIT) {
      toast({
        variant: "destructive",
        title: "Daily Limit Reached",
        description: `You have used your ${DAILY_SCAN_LIMIT} free scans for today. Please try again tomorrow.`,
      });
      return;
    }

    setIsLoading(true);
    setEditableExpenses([]);

    try {
      // Call our Gemini API endpoint
      const response = await fetch("/api/scan-expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageData: imagePreview,
        }),
      });

      if (!response.ok) {
        // Log the actual error for debugging but don't show to user
        const errorData = await response.json().catch(() => ({}));
        console.error("Scan API Error:", errorData);
        throw new Error("Scan Service Unavailable");
      }

      const data = await response.json();
      const extractedExpenses: ExtractedExpense[] = data.expenses || [];

      if (extractedExpenses.length === 0) {
        toast({
          title: "No Expenses Found",
          description:
            "We could not identify any expenses. Please try a clearer image.",
          variant: "destructive",
        });
      } else {
        incrementScanUsage(); // Only increment on success

        const otherCategory = categories.find((c) => c.name === "Other");
        const newEditableExpenses: EditableExpense[] = extractedExpenses.map(
          (exp) => {
            const categoryExists = categories.some(
              (c) => c.name.toLowerCase() === exp.category?.toLowerCase()
            );
            return {
              title: exp.title,
              amount: exp.amount,
              date: exp.date
                ? new Date(exp.date).toISOString()
                : new Date().toISOString(),
              category:
                exp.category && categoryExists
                  ? exp.category
                  : otherCategory?.name || "Other",
              paymentMode: exp.paymentMode || "Other",
            };
          }
        );
        setEditableExpenses(newEditableExpenses);
        toast({
          title: "Success!",
          description: `Found ${
            newEditableExpenses.length
          } expense(s). You have ${
            DAILY_SCAN_LIMIT - (scanUsage + 1)
          } scan(s) remaining today.`,
        });
      }
    } catch (error) {
      console.error("Scan Error:", error);
      // Simplified error message for the user
      toast({
        variant: "destructive",
        title: "Scan Unavailable",
        description:
          "The scan service is currently unavailable. Please try again later or add expenses manually.",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL("image/png");
        setImagePreview(dataUri);
        stopCamera();
        setEditableExpenses([]);
      }
    }
  };

  const resetImage = () => {
    setImagePreview(null);
    setEditableExpenses([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (activeTab === "camera") {
      startCamera();
    }
  };

  const handleSaveExpenses = async () => {
    if (editableExpenses.length === 0) return;
    setIsSaving(true);
    try {
      await addMultipleExpenses(editableExpenses);
      toast({
        title: "Success",
        description: `${editableExpenses.length} expense(s) have been added.`,
      });
      router.push("/expenses");
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the scanned expenses.",
      });
      setIsSaving(false);
    }
  };

  const handleExpenseChange = <K extends keyof EditableExpense>(
    index: number,
    field: K,
    value: EditableExpense[K]
  ) => {
    const newExpenses = [...editableExpenses];
    newExpenses[index][field] = value;
    setEditableExpenses(newExpenses);
  };

  const removeExpense = (index: number) => {
    setEditableExpenses(editableExpenses.filter((_, i) => i !== index));
  };

  const getAcceptFileType = () => {
    return scanMode === "document" ? "image/*,application/pdf" : "image/*";
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Scan Expenses</h1>
        <p className="text-muted-foreground">
          Extract expense details automatically using AI.
        </p>
      </div>

      {!isOnline && (
        <Alert variant="destructive">
          <AlertTitle>Offline Mode</AlertTitle>
          <AlertDescription>
            You are offline. Scanning requires an internet connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6">
        {/* Mode & Input Section */}
        <Card className="overflow-hidden border-2 bg-gradient-to-b from-card to-muted/20">
          <CardContent className="p-0">
            <Tabs
              value={scanMode}
              onValueChange={handleScanModeChange}
              className="w-full"
            >
              <div className="border-b bg-muted/40 p-4">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="line-items">Receipt List</TabsTrigger>
                  <TabsTrigger value="document">Full Document</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>

            <div className="p-6 space-y-6">
              {/* Input Method Switcher */}
              {!imagePreview && (
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2 mb-6">
                    <TabsTrigger value="upload" className="gap-2">
                      <Upload className="h-4 w-4" /> Upload
                    </TabsTrigger>
                    <TabsTrigger
                      value="camera"
                      className="gap-2"
                      disabled={scanMode === "document"}
                    >
                      <Camera className="h-4 w-4" /> Camera
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="mt-0">
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <ImageUp className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-1">
                        Tap to Select Image
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {scanMode === "document"
                          ? "PDFs or images"
                          : "JPG, PNG supported"}
                      </p>
                      <Button variant="outline" size="sm">
                        Choose from Library
                      </Button>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={getAcceptFileType()}
                        onChange={handleFileChange}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="camera" className="mt-0">
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] md:aspect-video shadow-inner">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
                      <div className="absolute inset-x-0 bottom-6 flex justify-center">
                        <Button
                          size="lg"
                          onClick={handleCapture}
                          disabled={!hasCameraPermission}
                          className="rounded-full h-16 w-16 p-0 border-4 border-white/20 shadow-xl"
                        >
                          <Camera className="h-8 w-8" />
                          <span className="sr-only">Capture</span>
                        </Button>
                      </div>
                    </div>
                    {hasCameraPermission === false && (
                      <p className="text-center text-destructive text-sm mt-2">
                        Camera access required.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              )}

              {/* Image Preview & Action */}
              {imagePreview && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="relative rounded-xl overflow-hidden border bg-black/5 shadow-sm group">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={600}
                      height={800}
                      className="w-full max-h-[500px] object-contain mx-auto"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-3 right-3 shadow-sm opacity-90 hover:opacity-100"
                      onClick={resetImage}
                    >
                      <CircleX className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      size="lg"
                      onClick={handleScanImage}
                      disabled={isLoading || !isOnline}
                      className="w-full text-base font-semibold h-12 shadow-md"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Analyzing Receipt...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Scan Expenses
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      {Math.max(0, DAILY_SCAN_LIMIT - scanUsage)} scan(s)
                      remaining today
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {(isLoading || editableExpenses.length > 0) && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {isLoading ? "Processing..." : "Extracted Expenses"}
              </h2>
              {editableExpenses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditableExpenses([])}
                  className="text-muted-foreground"
                >
                  Clear All
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="grid gap-4">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4 flex gap-4">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {editableExpenses.map((expense, index) => (
                  <Card
                    key={index}
                    className="group hover:border-primary/50 transition-colors"
                  >
                    <CardHeader className="p-4 flex flex-row items-center justify-between pb-2 space-y-0">
                      <div className="font-medium truncate flex-1 mr-2 text-lg">
                        {expense.title || "Untitled Expense"}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeExpense(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Amount
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-2.5 text-muted-foreground">
                              ₹
                            </span>
                            <Input
                              type="number"
                              className="pl-6 h-9"
                              value={expense.amount}
                              onChange={(e) =>
                                handleExpenseChange(
                                  index,
                                  "amount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Date
                          </Label>
                          <Popover
                            open={openDatePickerIndex === index}
                            onOpenChange={(isOpen) =>
                              setOpenDatePickerIndex(isOpen ? index : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-9 px-3",
                                  !expense.date && "text-muted-foreground"
                                )}
                              >
                                {expense.date ? (
                                  format(new Date(expense.date), "dd MMM")
                                ) : (
                                  <span>Pick date</span>
                                )}
                                <CalendarIcon className="ml-auto h-3 w-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="single"
                                selected={new Date(expense.date || new Date())}
                                onSelect={(date) => {
                                  handleExpenseChange(
                                    index,
                                    "date",
                                    date?.toISOString() || ""
                                  );
                                  setOpenDatePickerIndex(null);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label
                          htmlFor={`title-${index}`}
                          className="text-xs text-muted-foreground"
                        >
                          Details
                        </Label>
                        <div className="flex gap-2">
                          <Select
                            value={expense.category}
                            onValueChange={(val) =>
                              handleExpenseChange(index, "category", val)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((c) => (
                                <SelectItem key={c.id} value={c.name}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={expense.paymentMode}
                            onValueChange={(val: any) =>
                              handleExpenseChange(index, "paymentMode", val)
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Online">Online</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Sticky/Floating Save Button for Results */}
            <div className="sticky bottom-20 z-10 pt-4">
              <Button
                size="lg"
                className="w-full shadow-lg text-base"
                onClick={handleSaveExpenses}
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save {editableExpenses.length} Expense
                {editableExpenses.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
