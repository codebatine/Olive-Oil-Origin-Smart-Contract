import hardhat from 'hardhat';

const { ethers } = hardhat;

describe('OliveOilOrigin', function () {
  let contract;
  let owner, importer, retailer, unauthorizedUser;

  beforeEach(async function () {
    [owner, importer, retailer, unauthorizedUser] = await ethers.getSigners();
    const OliveOilOrigin = await ethers.getContractFactory('OliveOilOrigin');

    contract = await OliveOilOrigin.deploy();
    await contract.deployed();
  });

  it('Should create a new batch and verify public data', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    const batch = await contract.getCurrentBatch(1);
    if (batch.origin !== 'Italy') throw new Error('Origin mismatch');
    if (batch.status !== 'Produced') throw new Error('Status mismatch');
  });

  it('Should allow producer to mark the batch as Sent', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    const batch = await contract.getCurrentBatch(1);
    if (batch.status !== 'Sent') throw new Error('Status should be Sent');
    if (batch.currentLocation !== 'Rome')
      throw new Error('Current location mismatch');
  });

  it('Should restrict unauthorized user from marking batch as Sent', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);

    let reverted = false;
    try {
      await contract.connect(unauthorizedUser).markAsSent(1, 'Rome');
    } catch (error) {
      reverted = true;
    }
    if (!reverted) throw new Error('Expected transaction to revert');
  });

  it('Should allow importer to mark the batch as Received', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    await contract.connect(importer).markAsReceived(1, 'Milan');
    const batch = await contract.getCurrentBatch(1);
    if (batch.status !== 'Received')
      throw new Error('Status should be Received');
    if (batch.currentLocation !== 'Milan')
      throw new Error('Current location mismatch');
  });

  it('Should restrict retailer from marking batch as Received (only importer allowed)', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');

    let reverted = false;
    try {
      await contract.connect(retailer).markAsReceived(1, 'Milan');
    } catch (error) {
      reverted = true;
    }
    if (!reverted) throw new Error('Expected transaction to revert');
  });

  it('Should allow retailer to mark the batch as Delivered', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    await contract.connect(importer).markAsReceived(1, 'Milan');
    await contract.connect(retailer).markAsDelivered(1, 'Final Store');
    const batch = await contract.getCurrentBatch(1);
    if (batch.status !== 'Delivered')
      throw new Error('Status should be Delivered');
    if (batch.currentLocation !== 'Final Store')
      throw new Error('Current location mismatch');
  });

  it('Should restrict producer from marking batch as Delivered (only retailer allowed)', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    await contract.connect(importer).markAsReceived(1, 'Milan');

    let reverted = false;
    try {
      await contract.connect(owner).markAsDelivered(1, 'Final Store');
    } catch (error) {
      reverted = true;
    }
    if (!reverted) throw new Error('Expected transaction to revert');
  });

  it('Should allow authorized users to access batch history', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    await contract.connect(importer).markAsReceived(1, 'Milan');
    const history = await contract.connect(importer).getBatchHistory(1);
    if (history.length !== 3) throw new Error('History length should be 3');
  });

  it('Should restrict unauthorized users from accessing batch history', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);

    let reverted = false;
    try {
      await contract.connect(unauthorizedUser).getBatchHistory(1);
    } catch (error) {
      reverted = true;
    }
    if (!reverted) throw new Error('Expected transaction to revert');
  });

  it('Should allow authorized users to access full batch details', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    const fullDetails = await contract.connect(importer).getFullBatchDetails(1);
    if (fullDetails.origin !== 'Italy') throw new Error('Origin mismatch');
    if (fullDetails.producer !== owner.address)
      throw new Error('Producer mismatch');
  });

  it('Should restrict unauthorized users from accessing full batch details', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);

    let reverted = false;
    try {
      await contract.connect(unauthorizedUser).getFullBatchDetails(1);
    } catch (error) {
      reverted = true;
    }
    if (!reverted) throw new Error('Expected transaction to revert');
  });

  it('Should correctly log status changes in batch history', async function () {
    await contract
      .connect(owner)
      .createBatch(1, 'Italy', 1735123200, importer.address, retailer.address);
    await contract.connect(owner).markAsSent(1, 'Rome');
    await contract.connect(importer).markAsReceived(1, 'Milan');
    const history = await contract.getBatchHistory(1);
    if (history[0].status !== 'Produced')
      throw new Error('First status should be Produced');
    if (history[1].status !== 'Sent')
      throw new Error('Second status should be Sent');
    if (history[2].status !== 'Received')
      throw new Error('Third status should be Received');
  });
});
