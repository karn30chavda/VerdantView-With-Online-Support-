'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { scanExpenses } from '@/ai/flows/scan-expenses-flow';
import { scanDocumentForExpenses } from '@/ai/flows/scan-document-for-expenses';
import { useExpenses } from '@/hooks/use-expenses';
import { Loader2, Upload, Camera, Trash2, Calendar as CalendarIcon, IndianRupee, ImageUp, CircleX, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Expense } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';

type EditableExpense = Omit<Expense, 'id'>;

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export default function ExpenseScanner() {
  const { addMultipleExpenses, categories } = useExpenses();
  const router = useRouter();
  const { toast } = useToast();
  const [editableExpenses, setEditableExpenses] = useState<EditableExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [openDatePickerIndex, setOpenDatePickerIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [scanMode, setScanMode] = useState('line-items');

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (activeTab !== 'camera' || !navigator.mediaDevices) {
        setHasCameraPermission(false);
        return;
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings.',
        });
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (activeTab === 'camera') {
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
  }
  
  const handleScanModeChange = (value: string) => {
      setScanMode(value);
      resetScanState();
  }
  
  const resetScanState = () => {
      setEditableExpenses([]);
      setImagePreview(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if(activeTab === 'camera') {
          startCamera();
      }
  }

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
  
  const handleScanImage = async () => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        toast({ variant: 'destructive', title: 'Offline', description: 'An internet connection is required to use the AI scanner.' });
        return;
    }
    if (!imagePreview) {
        toast({ variant: 'destructive', title: 'No Image or PDF', description: 'Please select a document to scan.' });
        return;
    }
    setIsLoading(true);
    setEditableExpenses([]);
    
    try {
        const result = scanMode === 'line-items' 
          ? await scanExpenses({ photoDataUri: imagePreview })
          : await scanDocumentForExpenses({ photoDataUri: imagePreview });
        
        if (!result.expenses || result.expenses.length === 0) {
          toast({ title: 'No Expenses Found', description: 'The AI could not find any expenses in the document.' });
        } else {
            const otherCategory = categories.find(c => c.name === 'Other');
            const newEditableExpenses: EditableExpense[] = result.expenses.map(exp => {
                const categoryExists = categories.some(c => c.name.toLowerCase() === (exp as any).category?.toLowerCase());
                return {
                    title: exp.title,
                    amount: exp.amount,
                    date: (exp as any).date ? new Date((exp as any).date).toISOString() : new Date().toISOString(),
                    category: (exp as any).category && categoryExists ? (exp as any).category : (otherCategory?.name || 'Other'),
                    paymentMode: (exp as any).paymentMode || 'Other',
                }
            });
            setEditableExpenses(newEditableExpenses);
        }
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Scan Failed', description: 'Could not process the document. The model may be unavailable or an API key may be missing.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/png');
        setImagePreview(dataUri);
        stopCamera();
        setEditableExpenses([]);
      }
    }
  };
  
  const resetImage = () => {
    setImagePreview(null);
    setEditableExpenses([]);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
    if (activeTab === 'camera') {
        startCamera();
    }
  }

  const handleSaveExpenses = async () => {
    if (editableExpenses.length === 0) return;
    setIsSaving(true);
    try {
      await addMultipleExpenses(editableExpenses);
      toast({ title: 'Success', description: `${editableExpenses.length} expenses have been added.` });
      router.push('/expenses');
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the scanned expenses.' });
      setIsSaving(false);
    }
  };

  const handleExpenseChange = <K extends keyof EditableExpense>(index: number, field: K, value: EditableExpense[K]) => {
      const newExpenses = [...editableExpenses];
      newExpenses[index][field] = value;
      setEditableExpenses(newExpenses);
  };

  const removeExpense = (index: number) => {
      setEditableExpenses(editableExpenses.filter((_, i) => i !== index));
  };
  
  const getAcceptFileType = () => {
      return scanMode === 'document' ? "image/*,application/pdf" : "image/*";
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Scan Expenses</h1>
      
      <Tabs value={scanMode} onValueChange={handleScanModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="line-items">Scan Simple List</TabsTrigger>
            <TabsTrigger value="document">Import from Document</TabsTrigger>
        </TabsList>

        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 mt-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>1. Provide a Document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="h-4 w-4"/> Upload File
                        </TabsTrigger>
                        <TabsTrigger value="camera" className="flex items-center gap-2" disabled={scanMode === 'document'}>
                            <Camera className="h-4 w-4"/> Use Camera
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-4">
                        {imagePreview ? (
                            <div className="relative">
                                <Image src={imagePreview} alt="Expense list preview" className="rounded-md max-h-80 w-auto mx-auto" width={400} height={600} />
                                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={resetImage}>
                                    <CircleX className="h-5 w-5" />
                                </Button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 flex flex-col items-center justify-center text-center h-64">
                                <ImageUp className="h-12 w-12 text-muted-foreground"/>
                                <h3 className="mt-4 text-lg font-medium">Click to upload or drag and drop</h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {scanMode === 'document' ? 'Image or PDF file' : 'Image file (PNG, JPG, etc.)'}
                                </p>
                                <Button type="button" variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                                    Browse Files
                                </Button>
                                <Input 
                                    ref={fileInputRef} 
                                    type="file" 
                                    className="hidden" 
                                    accept={getAcceptFileType()}
                                    onChange={handleFileChange}
                                />
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="camera" className="mt-4">
                         <div className="space-y-2 bg-muted rounded-md p-2">
                            {imagePreview ? (
                                <div className="relative">
                                    <Image src={imagePreview} alt="Captured expense list" className="rounded-md w-full" width={1920} height={1080} />
                                    <Button variant="secondary" size="icon" className="absolute top-2 right-2" onClick={resetImage}>
                                        <RefreshCw className="h-5 w-5" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-black" autoPlay muted playsInline />
                                    {hasCameraPermission === false && (
                                        <Alert variant="destructive">
                                            <AlertTitle>Camera Access Required</AlertTitle>
                                            <AlertDescription>
                                                Please allow camera access to use this feature. You might need to refresh the page.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <Button onClick={handleCapture} className="w-full" disabled={!hasCameraPermission}>
                                        <Camera className="mr-2 h-4 w-4"/> Capture Photo
                                    </Button>
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button onClick={handleScanImage} disabled={!imagePreview || isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : null}
                  Scan Document
                </Button>
              </CardFooter>
            </Card>
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>2. Review and Save</CardTitle>
              </CardHeader>
              <CardContent className="min-h-[350px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : editableExpenses.length > 0 ? (
                  <Accordion type="multiple" className="w-full space-y-2">
                    {editableExpenses.map((expense, index) => (
                      <AccordionItem value={`item-${index}`} key={index} className="border rounded-md px-4">
                        <AccordionTrigger>
                            <div className="flex justify-between w-full pr-4">
                                <span className="font-medium truncate max-w-[150px]">{expense.title}</span>
                                <span className="flex items-center font-semibold shrink-0">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {formatCurrency(expense.amount)}
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`title-${index}`}>Title</Label>
                                        <Input id={`title-${index}`} value={expense.title} onChange={(e) => handleExpenseChange(index, 'title', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`amount-${index}`}>Amount</Label>
                                        <Input id={`amount-${index}`} type="number" value={expense.amount} onChange={(e) => handleExpenseChange(index, 'amount', parseFloat(e.target.value) || 0)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                         <Label>Date</Label>
                                        <Popover open={openDatePickerIndex === index} onOpenChange={(isOpen) => setOpenDatePickerIndex(isOpen ? index : null)}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className={cn('w-full justify-start text-left font-normal',!expense.date && 'text-muted-foreground')}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {expense.date ? format(new Date(expense.date), 'PPP') : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={new Date(expense.date)}
                                                    onSelect={(date) => {
                                                        handleExpenseChange(index, 'date', date?.toISOString() || '');
                                                        setOpenDatePickerIndex(null);
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`category-${index}`}>Category</Label>
                                        <Select value={expense.category} onValueChange={(value) => handleExpenseChange(index, 'category', value)}>
                                            <SelectTrigger id={`category-${index}`}>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.name}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Payment Mode</Label>
                                        <Select value={expense.paymentMode} onValueChange={(value: any) => handleExpenseChange(index, 'paymentMode', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a mode" />
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
                                 <div className="flex justify-end">
                                    <Button variant="ghost" size="icon" onClick={() => removeExpense(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4 border-2 border-dashed rounded-md">
                         <p className="text-muted-foreground">Scanned expenses will appear here.</p>
                    </div>
                )}
              </CardContent>
               <CardFooter>
                    <Button onClick={handleSaveExpenses} disabled={isSaving || editableExpenses.length === 0} className="w-full">
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Add {editableExpenses.length > 0 ? `${editableExpenses.length} ` : ''}Expenses
                    </Button>
                </CardFooter>
            </Card>
           </div>
      </Tabs>
    </div>
  );
}
