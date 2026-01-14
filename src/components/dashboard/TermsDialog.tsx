import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TermsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAccept: () => void;
    actionType: "buy" | "sell";
}

const TermsDialog = ({ open, onOpenChange, onAccept, actionType }: TermsDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-card border border-primary/20">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-gold-gradient">
                        {actionType === "buy" ? "شروط شراء الذهب" : "شروط بيع الذهب"}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 text-foreground/80 mt-4 text-right">
                        <p className="font-semibold">يرجى قراءة الشروط والأحكام التالية بعناية:</p>
                        <ul className="list-disc pr-4 space-y-2 text-sm">
                            <li>
                                يتم تنفيذ العمليات بناءً على سعر الذهب العالمي في وقت التنفيذ الفعلي.
                            </li>
                            <li>
                                يحق للعميل استرداد المبلغ المستثمر بالكامل قبل انتهاء مدة الاشتراك المحددة.
                            </li>
                            <li>
                                تطبق رسوم إدارية بسيطة عند الاسترداد المبكر وفقاً لسياسة المنصة.
                            </li>
                            <li>
                                عمليات البيع والشراء تخضع للمراجعة والتدقيق لضمان أمان المعاملات.
                            </li>
                        </ul>
                        <div className="bg-primary/10 p-3 rounded-md mt-4 border border-primary/20">
                            <p className="text-xs text-primary font-medium">
                                بموافقتك، أنت تقر بأنك قد قرأت وفهمت كافة الشروط والأحكام المذكورة أعلاه.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="border-primary/20 hover:bg-primary/10 hover:text-primary">إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onAccept}
                        className="bg-gold-gradient text-primary-foreground font-bold hover:opacity-90 transition-opacity"
                    >
                        موافق ومتابعة
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default TermsDialog;
