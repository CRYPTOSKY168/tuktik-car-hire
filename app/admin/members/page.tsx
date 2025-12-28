'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase/config';

interface Member {
    id: string;
    uid: string;
    email: string | null;
    displayName: string | null;
    phone: string | null;
    photoURL: string | null;
    provider: string;
    role: 'user' | 'admin';
    isActive: boolean;
    disabled: boolean;
    emailVerified: boolean;
    isApprovedDriver: boolean;
    isDriver: boolean;
    hasVehicleInfo: boolean;
    driverData: {
        id: string;
        vehiclePlate: string;
        vehicleModel: string;
        vehicleColor: string;
        status: string;
        setupStatus: 'pending_review' | 'approved' | 'rejected';
        idCardUrl: string | null;
        driverLicenseUrl: string | null;
    } | null;
    createdAt: string | null;
    lastSignIn: string | null;
    hasFirestoreProfile: boolean;
}

export default function MembersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
    const [driverFilter, setDriverFilter] = useState<'all' | 'approved' | 'not_approved'>('all');
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default - user can enable if needed

    // Get auth headers for API calls
    const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
        try {
            const user = auth?.currentUser;
            if (!user) return { 'Content-Type': 'application/json' };
            const token = await user.getIdToken();
            return {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
        } catch {
            return { 'Content-Type': 'application/json' };
        }
    }, []);

    useEffect(() => {
        loadMembers();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            loadMembers();
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadMembers = async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', { headers });
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch members');
            }

            setMembers(data.members);
            setLastRefresh(new Date());

            // Update selectedMember if modal is open
            if (selectedMember) {
                const updatedMember = data.members.find((m: Member) => m.id === selectedMember.id);
                if (updatedMember) {
                    setSelectedMember(updatedMember);
                }
            }
        } catch (err: any) {
            console.error('Error loading members:', err);
            setError(err.message || 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'user' | 'admin') => {
        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'updateRole',
                    userId: memberId,
                    data: { role: newRole }
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, role: newRole } : m
            ));
        } catch (err: any) {
            console.error('Error updating role:', err);
            alert('ไม่สามารถเปลี่ยนบทบาทได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleDisable = async (memberId: string, currentDisabled: boolean) => {
        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'toggleDisable',
                    userId: memberId,
                    data: { disabled: !currentDisabled }
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, disabled: !currentDisabled, isActive: currentDisabled } : m
            ));
        } catch (err: any) {
            console.error('Error toggling disable:', err);
            alert('ไม่สามารถเปลี่ยนสถานะได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveDriver = async (memberId: string) => {
        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'approveDriver',
                    userId: memberId,
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, isApprovedDriver: true } : m
            ));
        } catch (err: any) {
            console.error('Error approving driver:', err);
            alert('ไม่สามารถอนุมัติคนขับได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRevokeDriver = async (memberId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกสิทธิ์คนขับ?')) return;

        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'revokeDriver',
                    userId: memberId,
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, isApprovedDriver: false } : m
            ));
        } catch (err: any) {
            console.error('Error revoking driver:', err);
            alert('ไม่สามารถยกเลิกสิทธิ์คนขับได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case 'google': return 'g_mobiledata';
            case 'phone': return 'phone';
            default: return 'mail';
        }
    };

    const getProviderLabel = (provider: string) => {
        switch (provider) {
            case 'google': return 'Google';
            case 'phone': return 'Phone';
            default: return 'Email';
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDriverStatus = (member: Member) => {
        // Rejected - needs to re-upload documents
        if (member.driverData?.setupStatus === 'rejected') {
            return { label: 'ถูกปฏิเสธ', color: 'bg-red-100 text-red-700', icon: 'cancel' };
        }
        // Has vehicle info but pending review
        if (member.driverData?.setupStatus === 'pending_review') {
            return { label: 'รอตรวจสอบ', color: 'bg-orange-100 text-orange-700', icon: 'rate_review' };
        }
        // Active driver (approved setup)
        if (member.isDriver && member.hasVehicleInfo && member.driverData?.setupStatus === 'approved') {
            return { label: 'คนขับ', color: 'bg-green-100 text-green-700', icon: 'local_taxi' };
        }
        // Approved but hasn't filled vehicle info yet
        if (member.isApprovedDriver && !member.hasVehicleInfo && !member.isDriver) {
            return { label: 'รอตั้งค่า', color: 'bg-amber-100 text-amber-700', icon: 'pending' };
        }
        // Has vehicle info but no setupStatus (old drivers - treat as active)
        if (member.isDriver && member.hasVehicleInfo && !member.driverData?.setupStatus) {
            return { label: 'คนขับ', color: 'bg-green-100 text-green-700', icon: 'local_taxi' };
        }
        if (member.isApprovedDriver) {
            return { label: 'อนุมัติแล้ว', color: 'bg-blue-100 text-blue-700', icon: 'check_circle' };
        }
        return null;
    };

    const handleApproveDriverSetup = async (memberId: string) => {
        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'approveDriverSetup',
                    userId: memberId,
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Reload to get updated data
            await loadMembers();
        } catch (err: any) {
            console.error('Error approving driver setup:', err);
            alert('ไม่สามารถอนุมัติข้อมูลคนขับได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectDriverSetup = async (memberId: string) => {
        if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการปฏิเสธการลงทะเบียนคนขับนี้?')) return;

        setActionLoading(memberId);
        try {
            const headers = await getAuthHeaders();
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'rejectDriverSetup',
                    userId: memberId,
                })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error);

            // Reload to get updated data
            await loadMembers();
        } catch (err: any) {
            console.error('Error rejecting driver setup:', err);
            alert('ไม่สามารถปฏิเสธข้อมูลคนขับได้: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // Filter members
    const filteredMembers = members.filter(member => {
        const matchesSearch =
            member.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.phone?.includes(searchTerm);

        const matchesRole = roleFilter === 'all' || member.role === roleFilter;

        const matchesDriver =
            driverFilter === 'all' ||
            (driverFilter === 'approved' && member.isApprovedDriver) ||
            (driverFilter === 'not_approved' && !member.isApprovedDriver);

        return matchesSearch && matchesRole && matchesDriver;
    });

    const stats = {
        total: members.length,
        admins: members.filter(m => m.role === 'admin').length,
        approvedDrivers: members.filter(m => m.isApprovedDriver).length,
        activeDrivers: members.filter(m => m.isDriver && m.hasVehicleInfo && m.driverData?.setupStatus === 'approved').length,
        pendingReview: members.filter(m => m.driverData?.setupStatus === 'pending_review').length,
        rejected: members.filter(m => m.driverData?.setupStatus === 'rejected').length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500">กำลังโหลดข้อมูลสมาชิก...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
                    <span className="material-symbols-outlined text-4xl text-red-500 mb-3">error</span>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">ไม่สามารถโหลดข้อมูลได้</h3>
                    <p className="text-sm text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadMembers}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        ลองใหม่
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">จัดการสมาชิก</h1>
                    <p className="text-gray-500">จัดการผู้ใช้และอนุมัติคนขับ</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Last refresh time */}
                    <div className="text-xs text-gray-500">
                        อัปเดตล่าสุด: {lastRefresh.toLocaleTimeString('th-TH')}
                    </div>
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            autoRefresh
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={autoRefresh ? 'รีเฟรชอัตโนมัติ เปิด (ทุก 30 วินาที)' : 'รีเฟรชอัตโนมัติ ปิด'}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {autoRefresh ? 'sync' : 'sync_disabled'}
                        </span>
                    </button>
                    {/* Manual refresh */}
                    <button
                        onClick={loadMembers}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>
                        รีเฟรช
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">group</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                            <p className="text-sm text-gray-500">ทั้งหมด</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-600">admin_panel_settings</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.admins}</p>
                            <p className="text-sm text-gray-500">แอดมิน</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">how_to_reg</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.approvedDrivers}</p>
                            <p className="text-sm text-gray-500">อนุมัติแล้ว</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600">local_taxi</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.activeDrivers}</p>
                            <p className="text-sm text-gray-500">คนขับ</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-orange-600">rate_review</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{stats.pendingReview}</p>
                            <p className="text-sm text-gray-500">รอตรวจสอบ</p>
                        </div>
                    </div>
                </div>
                {stats.rejected > 0 && (
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600">cancel</span>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{stats.rejected}</p>
                                <p className="text-sm text-gray-500">ถูกปฏิเสธ</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <label htmlFor="member-search" className="sr-only">ค้นหาสมาชิก</label>
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            id="member-search"
                            name="memberSearch"
                            type="text"
                            placeholder="ค้นหาด้วยชื่อ, อีเมล, หรือเบอร์โทร..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>

                    {/* Role Filter */}
                    <div>
                        <label htmlFor="role-filter" className="sr-only">กรองตามบทบาท</label>
                        <select
                            id="role-filter"
                            name="roleFilter"
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value as any)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="all">ทุกบทบาท</option>
                            <option value="user">สมาชิก</option>
                            <option value="admin">แอดมิน</option>
                        </select>
                    </div>

                    {/* Driver Filter */}
                    <div>
                        <label htmlFor="driver-filter" className="sr-only">กรองตามสถานะคนขับ</label>
                        <select
                            id="driver-filter"
                            name="driverFilter"
                            value={driverFilter}
                            onChange={(e) => setDriverFilter(e.target.value as any)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="all">ทุกสมาชิก</option>
                            <option value="approved">คนขับที่อนุมัติ</option>
                            <option value="not_approved">ยังไม่อนุมัติ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Members List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {filteredMembers.length === 0 ? (
                    <div className="p-12 text-center">
                        <span className="material-symbols-outlined text-5xl text-gray-300 mb-3">person_off</span>
                        <p className="text-gray-500">ไม่พบสมาชิก</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">สมาชิก</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">ติดต่อ</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">บทบาท</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">สถานะคนขับ</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">เข้าใช้ล่าสุด</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">การดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredMembers.map((member) => {
                                    const driverStatus = getDriverStatus(member);
                                    return (
                                        <tr key={member.id} className={`hover:bg-gray-50 ${member.disabled ? 'opacity-60' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {member.photoURL ? (
                                                        <img
                                                            src={member.photoURL}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                            {(member.displayName || member.email || '?')[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium text-gray-800">
                                                                {member.displayName || 'ไม่มีชื่อ'}
                                                            </p>
                                                            {member.emailVerified && (
                                                                <span className="material-symbols-outlined text-blue-500 text-sm" title="ยืนยันอีเมลแล้ว">verified</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="material-symbols-outlined text-sm">{getProviderIcon(member.provider)}</span>
                                                            {getProviderLabel(member.provider)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-800">{member.email || '-'}</p>
                                                <p className="text-sm text-gray-500">{member.phone || '-'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                    member.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    <span className="material-symbols-outlined text-sm">
                                                        {member.role === 'admin' ? 'shield' : 'person'}
                                                    </span>
                                                    {member.role === 'admin' ? 'แอดมิน' : 'สมาชิก'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {driverStatus ? (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedMember(member);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current transition-all ${driverStatus.color}`}
                                                    >
                                                        <span className="material-symbols-outlined text-sm">{driverStatus.icon}</span>
                                                        {driverStatus.label}
                                                        {driverStatus.label === 'Pending Review' && (
                                                            <span className="material-symbols-outlined text-sm ml-1">open_in_new</span>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-500">{formatDate(member.lastSignIn)}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {/* View Details */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedMember(member);
                                                            setShowDetailModal(true);
                                                        }}
                                                        className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                        title="ดูรายละเอียด"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                                    </button>

                                                    {/* Role Toggle */}
                                                    <button
                                                        onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'user' : 'admin')}
                                                        disabled={actionLoading === member.id}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            member.role === 'admin'
                                                                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                        }`}
                                                        title={member.role === 'admin' ? 'ลบสิทธิ์แอดมิน' : 'ตั้งเป็นแอดมิน'}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {member.role === 'admin' ? 'shield' : 'add_moderator'}
                                                        </span>
                                                    </button>

                                                    {/* Approve/Revoke Driver OR Approve Setup */}
                                                    {member.driverData?.setupStatus === 'pending_review' ? (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedMember(member);
                                                                    setShowDetailModal(true);
                                                                }}
                                                                disabled={actionLoading === member.id}
                                                                className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                                title="ดูและอนุมัติ"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">rate_review</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleApproveDriverSetup(member.id)}
                                                                disabled={actionLoading === member.id}
                                                                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                                                title="อนุมัติข้อมูลรถ"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectDriverSetup(member.id)}
                                                                disabled={actionLoading === member.id}
                                                                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                                                title="ปฏิเสธข้อมูลรถ"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">cancel</span>
                                                            </button>
                                                        </>
                                                    ) : !member.isApprovedDriver ? (
                                                        <button
                                                            onClick={() => handleApproveDriver(member.id)}
                                                            disabled={actionLoading === member.id}
                                                            className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                                                            title="อนุมัติเป็นคนขับ"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">how_to_reg</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRevokeDriver(member.id)}
                                                            disabled={actionLoading === member.id}
                                                            className="p-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                                                            title="ยกเลิกสิทธิ์คนขับ"
                                                        >
                                                            <span className="material-symbols-outlined text-lg">person_remove</span>
                                                        </button>
                                                    )}

                                                    {/* Toggle Disable */}
                                                    <button
                                                        onClick={() => handleToggleDisable(member.id, member.disabled)}
                                                        disabled={actionLoading === member.id}
                                                        className={`p-2 rounded-lg transition-colors ${
                                                            !member.disabled
                                                                ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                                                        }`}
                                                        title={member.disabled ? 'เปิดใช้งานบัญชี' : 'ปิดการใช้งานบัญชี'}
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {member.disabled ? 'lock_open' : 'lock'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedMember && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-800">รายละเอียดสมาชิก</h2>
                                <button
                                    onClick={() => { setShowDetailModal(false); setSelectedMember(null); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-4">
                                {selectedMember.photoURL ? (
                                    <img src={selectedMember.photoURL} alt="" className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {(selectedMember.displayName || selectedMember.email || '?')[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{selectedMember.displayName || 'ไม่มีชื่อ'}</h3>
                                    <p className="text-sm text-gray-500">{selectedMember.email}</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                            selectedMember.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {selectedMember.role}
                                        </span>
                                        {selectedMember.isApprovedDriver && (
                                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">คนขับ</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">UID</p>
                                    <p className="text-sm font-mono text-gray-800 break-all">{selectedMember.uid}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">ผู้ให้บริการ</p>
                                    <p className="text-sm text-gray-800">{getProviderLabel(selectedMember.provider)}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">เบอร์โทร</p>
                                    <p className="text-sm text-gray-800">{selectedMember.phone || '-'}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">สถานะบัญชี</p>
                                    <p className={`text-sm font-medium ${selectedMember.disabled ? 'text-red-600' : 'text-green-600'}`}>
                                        {selectedMember.disabled ? 'ปิดใช้งาน' : 'ใช้งานได้'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">สถานะคนขับ</p>
                                    <p className={`text-sm font-medium ${selectedMember.isApprovedDriver ? 'text-green-600' : 'text-gray-500'}`}>
                                        {selectedMember.isApprovedDriver ? (selectedMember.hasVehicleInfo ? 'ใช้งานได้' : 'รอตั้งค่า') : 'ยังไม่อนุมัติ'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-xs text-gray-500 mb-1">เข้าใช้ล่าสุด</p>
                                    <p className="text-sm text-gray-800">{formatDate(selectedMember.lastSignIn)}</p>
                                </div>
                            </div>

                            {/* Driver Info */}
                            {selectedMember.isDriver && selectedMember.driverData && (
                                <div className={`rounded-xl p-4 ${
                                    selectedMember.driverData.setupStatus === 'rejected' ? 'bg-red-50' :
                                    selectedMember.driverData.setupStatus === 'pending_review' ? 'bg-orange-50' : 'bg-green-50'
                                }`}>
                                    <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                                        selectedMember.driverData.setupStatus === 'rejected' ? 'text-red-800' :
                                        selectedMember.driverData.setupStatus === 'pending_review' ? 'text-orange-800' : 'text-green-800'
                                    }`}>
                                        <span className="material-symbols-outlined">local_taxi</span>
                                        ข้อมูลรถ
                                        {selectedMember.driverData.setupStatus === 'rejected' && (
                                            <span className="ml-auto px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-full">ถูกปฏิเสธ</span>
                                        )}
                                        {selectedMember.driverData.setupStatus === 'pending_review' && (
                                            <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded-full">รอตรวจสอบ</span>
                                        )}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-500">ทะเบียนรถ</p>
                                            <p className="font-medium text-gray-800">{selectedMember.driverData.vehiclePlate}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">รุ่นรถ</p>
                                            <p className="font-medium text-gray-800">{selectedMember.driverData.vehicleModel}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">สี</p>
                                            <p className="font-medium text-gray-800">{selectedMember.driverData.vehicleColor}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">สถานะ</p>
                                            <p className="font-medium text-gray-800 capitalize">{selectedMember.driverData.status}</p>
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    {(selectedMember.driverData.idCardUrl || selectedMember.driverData.driverLicenseUrl) && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-sm font-medium text-gray-700 mb-3">เอกสาร</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedMember.driverData.idCardUrl && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">บัตรประชาชน</p>
                                                        <a
                                                            href={selectedMember.driverData.idCardUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <img
                                                                src={selectedMember.driverData.idCardUrl}
                                                                alt="ID Card"
                                                                className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-indigo-400 transition-colors"
                                                            />
                                                        </a>
                                                    </div>
                                                )}
                                                {selectedMember.driverData.driverLicenseUrl && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">ใบขับขี่</p>
                                                        <a
                                                            href={selectedMember.driverData.driverLicenseUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <img
                                                                src={selectedMember.driverData.driverLicenseUrl}
                                                                alt="Driver License"
                                                                className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-indigo-400 transition-colors"
                                                            />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action buttons for pending review */}
                                    {selectedMember.driverData.setupStatus === 'pending_review' && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    handleApproveDriverSetup(selectedMember.id);
                                                    setShowDetailModal(false);
                                                }}
                                                disabled={actionLoading === selectedMember.id}
                                                className="flex-1 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                                อนุมัติ
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleRejectDriverSetup(selectedMember.id);
                                                    setShowDetailModal(false);
                                                }}
                                                disabled={actionLoading === selectedMember.id}
                                                className="flex-1 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-lg">cancel</span>
                                                ปฏิเสธ
                                            </button>
                                        </div>
                                    )}

                                    {/* Message for rejected status */}
                                    {selectedMember.driverData.setupStatus === 'rejected' && (
                                        <div className="mt-4 pt-4 border-t border-red-200">
                                            <div className="flex items-center gap-2 text-red-700 mb-2">
                                                <span className="material-symbols-outlined">info</span>
                                                <span className="font-medium">เอกสารถูกปฏิเสธ</span>
                                            </div>
                                            <p className="text-sm text-red-600">
                                                Driver จะต้องอัปโหลดเอกสารใหม่อีกครั้ง ระบบจะนำ Driver ไปยังหน้าลงทะเบียนใหม่โดยอัตโนมัติ
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
