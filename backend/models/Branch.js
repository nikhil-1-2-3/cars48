import prisma from '../config/prisma.js';
import { attachId, createQueryWrapper } from './modelUtils.js';

class BranchModelInstance {
    constructor(data = {}) {
        Object.assign(this, data);
        if (this.id && !this._id) {
            this._id = this.id;
        }
        if (typeof this.location === 'string') {
            try { this.location = JSON.parse(this.location); } catch (e) {}
        }
        if (typeof this.contactInfo === 'string') {
            try { this.contactInfo = JSON.parse(this.contactInfo); } catch (e) {}
        }
    }

    async save() {
        const dataToSave = {
            name: this.name,
            location: this.location || {},
            managerId: this.managerId?.toString() || null,
            contactInfo: this.contactInfo || {},
        };

        if (this.id || this._id) {
            const id = this.id || this._id;
            const updated = await prisma.branch.update({
                where: { id: id.toString() },
                data: dataToSave,
            });
            Object.assign(this, updated);
            this._id = this.id;
            return this;
        } else {
            const created = await prisma.branch.create({
                data: dataToSave,
            });
            Object.assign(this, created);
            this._id = this.id;
            return this;
        }
    }

    async deleteOne() {
        const id = this.id || this._id;
        if (id) {
            await prisma.branch.delete({ where: { id: id.toString() } });
        }
    }
}

const Branch = function(data) {
    return new BranchModelInstance(data);
};

Branch.create = async function(data) {
    const instance = new BranchModelInstance(data);
    return await instance.save();
};

Branch.findOne = async function(filter = {}) {
    let where = {};
    if (filter.id || filter._id) where.id = (filter.id || filter._id).toString();
    if (filter.name) where.name = filter.name;

    const branch = await prisma.branch.findFirst({ where });
    if (!branch) return null;
    return new BranchModelInstance(branch);
};

Branch.findById = function(id) {
    return createQueryWrapper(async () => {
        if (!id) return null;
        const branch = await prisma.branch.findUnique({
            where: { id: id.toString() },
        });
        if (!branch) return null;
        return new BranchModelInstance(branch);
    });
};

Branch.find = function(filter = {}) {
    return createQueryWrapper(async ({ populateOpts }) => {
        let where = {};
        if (filter.id || filter._id) where.id = (filter.id || filter._id).toString();

        const branches = await prisma.branch.findMany({
            where,
            include: {
                manager: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return branches.map(b => {
            const inst = new BranchModelInstance(b);
            if (b.manager) {
                inst.managerId = {
                    id: b.manager.id,
                    _id: b.manager.id,
                    name: b.manager.name,
                    email: b.manager.email,
                };
            }
            return inst;
        });
    });
};

Branch.deleteMany = async function() {
    return await prisma.branch.deleteMany({});
};

export default Branch;
