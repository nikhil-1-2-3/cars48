import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper } from './modelUtils.js';

class MaintenanceModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
    }

    async save() {
        const vehicleIdVal = (this.vehicleId && typeof this.vehicleId === 'object')
            ? (this.vehicleId.id || this.vehicleId._id)
            : this.vehicleId;

        const dataToSave = {
            vehicleId: vehicleIdVal ? vehicleIdVal.toString() : null,
            serviceDate: new Date(this.serviceDate || Date.now()),
            cost: Number(this.cost) || 0,
            description: this.description || '',
            serviceCenter: this.serviceCenter || null,
            notes: this.notes || null,
            status: this.status || 'Scheduled',
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.maintenance.update({
                where: { id: id.toString() },
                data: dataToSave,
                include: { vehicle: true },
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.maintenance.create({
                data: dataToSave,
                include: { vehicle: true },
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.maintenance.delete({ where: { id: id.toString() } });
        }
    }
}

function mapMaintenance(m) {
    const inst = new MaintenanceModelInstance(m);
    if (m.vehicle) {
        inst.vehicleId = {
            id: m.vehicle.id,
            _id: m.vehicle.id,
            brand: m.vehicle.brand,
            model: m.vehicle.model,
            registrationNumber: m.vehicle.registrationNumber,
            branchId: m.vehicle.branchId,
        };
    }
    return inst;
}

const Maintenance = function(data) {
    return new MaintenanceModelInstance(data);
};

Maintenance.find = function(filter = {}) {
    return createQueryWrapper(async () => {
        let where = {};
        if (filter.vehicleId?.$in) {
            where.vehicleId = {
                in: filter.vehicleId.$in.map(id => (id._id || id.id || id).toString()),
            };
        } else if (filter.vehicleId) {
            where.vehicleId = (filter.vehicleId._id || filter.vehicleId.id || filter.vehicleId).toString();
        }

        const records = await prisma.maintenance.findMany({
            where,
            include: { vehicle: true },
            orderBy: { createdAt: 'desc' },
        });

        return records.map(m => mapMaintenance(m));
    });
};

Maintenance.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const record = await prisma.maintenance.findUnique({
            where: { id: id.toString() },
            include: { vehicle: true },
        });
        if (!record) return null;
        return mapMaintenance(record);
    });
};

Maintenance.deleteMany = async function() {
    return await prisma.maintenance.deleteMany({});
};

export default Maintenance;
