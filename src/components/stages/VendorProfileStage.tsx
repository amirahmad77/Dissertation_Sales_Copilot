import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, MapPin, Phone, Mail, Clock, Copy, Users, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Lead, type OpeningHours, type Contact } from '@/store/useLeadStore';

interface VendorProfileStageProps {
  lead: Lead;
  onUpdateOpeningHours: (openingHours: OpeningHours) => void;
  onUpdateContactName: (contactName: string) => void;
  onUpdateContacts: (contacts: Contact[]) => void;
  onMarkComplete: () => void;
}

const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const weekdayDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function VendorProfileStage({ lead, onUpdateOpeningHours, onUpdateContactName, onUpdateContacts, onMarkComplete }: VendorProfileStageProps) {
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    lead.openingHours || {}
  );
  const primaryContact = lead.contacts.find(contact => contact.role === 'Primary');
  const [contactName, setContactName] = useState(primaryContact?.name || lead.contactName || '');
  const [newContact, setNewContact] = useState<{ name: string; role: Contact['role']; phone: string; email: string }>({
    name: '',
    role: 'Decision Maker',
    phone: '',
    email: ''
  });

  useEffect(() => {
    setContactName(primaryContact?.name || lead.contactName || '');
  }, [primaryContact?.name, lead.contactName]);

  const generateContactId = () => `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleContactChange = (contactId: string, field: keyof Contact, value: string | Contact['role']) => {
    let updatedContacts = lead.contacts.map(contact => {
      if (contact.id !== contactId) return contact;

      if (field === 'role') {
        return { ...contact, role: value as Contact['role'] };
      }

      if (field === 'phone' || field === 'email') {
        return { ...contact, [field]: (value as string).trim() };
      }

      return { ...contact, [field]: value as string };
    });

    if (field === 'role' && value === 'Primary') {
      updatedContacts = updatedContacts.map(contact =>
        contact.id === contactId
          ? { ...contact, role: 'Primary' }
          : contact.role === 'Primary'
            ? { ...contact, role: 'Decision Maker' }
            : contact
      );
    }

    onUpdateContacts(updatedContacts);
  };

  const handleRemoveContact = (contactId: string) => {
    const updatedContacts = lead.contacts.filter(contact => contact.id !== contactId);
    onUpdateContacts(updatedContacts);
  };

  const handleAddContact = () => {
    if (!newContact.name.trim()) return;
    const trimmedPhone = newContact.phone.trim();
    const trimmedEmail = newContact.email.trim();
    const contactEntry: Contact = {
      id: generateContactId(),
      name: newContact.name.trim(),
      role: newContact.role,
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {})
    };

    let updatedContacts = [...lead.contacts, contactEntry];
    if (contactEntry.role === 'Primary') {
      updatedContacts = updatedContacts.map(contact =>
        contact.id === contactEntry.id
          ? contact
          : contact.role === 'Primary'
            ? { ...contact, role: 'Decision Maker' }
            : contact
      );
    }

    onUpdateContacts(updatedContacts);
    setNewContact({ name: '', role: 'Decision Maker', phone: '', email: '' });
  };

  const primaryContactCount = lead.contacts.filter(contact => contact.role === 'Primary').length;

  const handleDayToggle = (day: string) => {
    const updatedHours = {
      ...openingHours,
      [day]: {
        ...openingHours[day],
        isOpen: !openingHours[day]?.isOpen
      }
    };
    setOpeningHours(updatedHours);
    onUpdateOpeningHours(updatedHours);
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    const updatedHours = {
      ...openingHours,
      [day]: {
        ...openingHours[day],
        [field]: value
      }
    };
    setOpeningHours(updatedHours);
    onUpdateOpeningHours(updatedHours);
  };

  const copyToWeekdays = () => {
    // Use Monday's schedule as template
    const mondaySchedule = openingHours['Monday'];
    if (!mondaySchedule) return;

    const updatedHours = { ...openingHours };
    weekdayDays.forEach(day => {
      updatedHours[day] = { ...mondaySchedule };
    });
    
    setOpeningHours(updatedHours);
    onUpdateOpeningHours(updatedHours);
  };

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'Restaurant':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Retail':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Services':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium': 
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isComplete = !!(
    lead.companyName &&
    (primaryContact?.name || contactName) &&
    lead.phone &&
    lead.address &&
    lead.openingHours &&
    Object.values(lead.openingHours).some(day => day.isOpen)
  );

  return (
    <div className="space-y-6">
      {/* Business Information Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{lead.companyName}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Badge className={cn("w-fit", getBusinessTypeColor(lead.businessType))}>
                {lead.businessType}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label>Primary Contact Name *</Label>
              {primaryContact ? (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <span className="font-medium">{primaryContact.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={contactName}
                    onChange={(e) => {
                      setContactName(e.target.value);
                      onUpdateContactName(e.target.value);
                    }}
                    placeholder="Enter primary contact name"
                    className={!contactName ? "border-destructive" : ""}
                  />
                  {!contactName && (
                    <p className="text-sm text-destructive">Primary contact name is required</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Badge className={cn("w-fit", getPriorityColor(lead.priority))}>
                {lead.priority}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Address</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{lead.address}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Key Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lead.contacts.length > 0 ? (
            <div className="space-y-4">
              {lead.contacts.map((contact) => (
                <div key={contact.id} className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => handleContactChange(contact.id, 'name', e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={contact.role}
                        onValueChange={(value) => handleContactChange(contact.id, 'role', value as Contact['role'])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {(['Owner', 'Decision Maker', 'Finance', 'Primary'] as Contact['role'][]).map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={contact.phone || ''}
                        onChange={(e) => handleContactChange(contact.id, 'phone', e.target.value)}
                        placeholder="Optional phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={contact.email || ''}
                        onChange={(e) => handleContactChange(contact.id, 'email', e.target.value)}
                        placeholder="Optional email address"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveContact(contact.id)}
                      disabled={contact.role === 'Primary' && primaryContactCount <= 1}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contacts added yet.</p>
          )}

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newContact.role}
                  onValueChange={(value) => setNewContact(prev => ({ ...prev, role: value as Contact['role'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['Owner', 'Decision Maker', 'Finance', 'Primary'] as Contact['role'][]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={newContact.phone}
                  onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Optional phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={newContact.email}
                  onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Optional email address"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddContact} disabled={!newContact.name.trim()}>
                Add Contact
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opening Hours Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Opening Hours
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToWeekdays}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy to all Weekdays
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map(day => (
              <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="w-20 font-medium">{day}</div>
                
                <Switch
                  checked={openingHours[day]?.isOpen || false}
                  onCheckedChange={() => handleDayToggle(day)}
                />
                
                {openingHours[day]?.isOpen && (
                  <div className="flex items-center gap-2 ml-4">
                    <Input
                      type="time"
                      value={openingHours[day]?.openTime || '09:00'}
                      onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                      className="w-28"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={openingHours[day]?.closeTime || '22:00'}
                      onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
                
                {!openingHours[day]?.isOpen && (
                  <span className="text-muted-foreground ml-4">Closed</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Actions */}
      <div className="flex justify-end">
        <Button 
          onClick={onMarkComplete}
          disabled={!isComplete}
          className="bg-success hover:bg-success/90"
        >
          Complete Vendor Profile
        </Button>
      </div>
    </div>
  );
}