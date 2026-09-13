import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Mail, User, HelpCircle, Laptop } from 'lucide-react';

export const metadata = {
  title: "Contact",
};

const ContactCard = ({ name, phone, role }) => (
  <div className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors gap-4">
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <User className="h-5 w-5 text-primary" />
      </div>
      <div className="text-left">
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-2" asChild title="Call">
        <a href={`tel:+91${phone}`}>
          <Phone className="h-4 w-4" />
          <span className="sm:hidden">Call</span>
        </a>
      </Button>
      <Button variant="outline" size="sm" className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50" asChild title="WhatsApp">
        <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </Button>
    </div>
  </div>
);

export default function ContactPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 md:py-10 px-4 max-w-4xl">
        <div className="mb-10 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Need help? Reach out to us for any queries regarding logistics.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Website Queries Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Laptop className="h-5 w-5 text-primary" />
                <CardTitle>Technical Support</CardTitle>
              </div>
              <CardDescription>
                For technical issues, bugs, or website related queries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactCard name="Akash Shaw" phone="8274076737" role="CC, Logistics" />
            </CardContent>
          </Card>

          {/* General Queries Section */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="h-5 w-5 text-primary" />
                <CardTitle>General Queries</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ContactCard name="Divya Battu" phone="7013106669" role="CC, Logistics" />
              <ContactCard name="Nishant Bhandari" phone="9789879670" role="CC, Logistics" />
            </CardContent>
          </Card>

          {/* Email Section */}
          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-left">
                <div className="h-12 w-12 rounded-full bg-background border flex items-center justify-center shrink-0 shadow-sm">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Email Us</h3>
                  <p className="text-muted-foreground">logistics.revels26@gmail.com</p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <a href="mailto:logistics.revels26@gmail.com">
                  Send Email
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
