// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract OliveOilOrigin {
    // Struct to hold essential public batch details (without sensitive addresses)
    struct PublicBatch {
        string origin;                // Country of origin of the olive oil batch
        uint256 productionDate;       // Production date in Unix timestamp format // Change in final frontend version
        string currentLocation;       // Current location of the batch
        string status;                // Current status of the batch
    }
    
    // Struct to hold full batch details (includes sensitive address information)
    struct BatchDetails {
        string origin;
        uint256 productionDate;
        string currentLocation;
        string status;
        address produoilcer;
        address importer;
        address retailer;
    }
    
    // Struct to log each status update's details
    struct StatusLog {
        string status;
        string location;
        uint256 timestamp;
    }
    
    mapping(uint256 => PublicBatch) public batches;               // Public mapping
    mapping(uint256 => BatchDetails) private batchDetails;        // Private mapping for full details with addresses
    mapping(uint256 => StatusLog[]) private batchHistory;         // Private mapping for historical status

    event BatchCreated(uint256 batchId, string origin, uint256 productionDate);
    event StatusUpdated(uint256 batchId, string newStatus, string location, address updatedBy);

    modifier onlyProducer(uint256 batchId) {
        require(msg.sender == batchDetails[batchId].producer, "Only the producer can perform this action");
        _;
    }

    modifier onlyImporter(uint256 batchId) {
        require(msg.sender == batchDetails[batchId].importer, "Only the assigned importer can perform this action");
        _;
    }

    modifier onlyRetailer(uint256 batchId) {
        require(msg.sender == batchDetails[batchId].retailer, "Only the assigned retailer can perform this action");
        _;
    }

    modifier atRequiredStatus(uint256 batchId, string memory requiredStatus) {
        require(
            keccak256(abi.encodePacked(batches[batchId].status)) == keccak256(abi.encodePacked(requiredStatus)),
            string(abi.encodePacked("Action only allowed when batch status is: ", requiredStatus))
        );
        _;
    }

    // Function to create a new batch by the producer
    function createBatch(
        uint256 batchId,
        string memory origin,
        uint256 productionDate,
        address importer,
        address retailer
    ) public {
        require(batchDetails[batchId].producer == address(0), "Batch ID already exists");

        // Set basic public batch info without sensitive addresses
        batches[batchId] = PublicBatch(origin, productionDate, origin, "Produced");

        // Set detailed batch info with addresses
        batchDetails[batchId] = BatchDetails(origin, productionDate, origin, "Produced", msg.sender, importer, retailer);
        
        batchHistory[batchId].push(StatusLog("Produced", origin, block.timestamp));
        emit BatchCreated(batchId, origin, productionDate);
    }

    // Producer marks batch as Sent
    function markAsSent(uint256 batchId, string memory location) public onlyProducer(batchId) atRequiredStatus(batchId, "Produced") {
        updateStatus(batchId, "Sent", location);
    }

    // Importer marks batch as Received
    function markAsReceived(uint256 batchId, string memory location) public onlyImporter(batchId) atRequiredStatus(batchId, "Sent") {
        updateStatus(batchId, "Received", location);
    }

    // Retailer marks batch as Delivered
    function markAsDelivered(uint256 batchId, string memory location) public onlyRetailer(batchId) atRequiredStatus(batchId, "Received") {
        updateStatus(batchId, "Delivered", location);
    }

    // Internal function to update status and log it
    function updateStatus(uint256 batchId, string memory newStatus, string memory location) internal {
        PublicBatch storage publicBatch = batches[batchId];
        BatchDetails storage detailedBatch = batchDetails[batchId];
        
        publicBatch.status = newStatus;
        publicBatch.currentLocation = location;
        
        detailedBatch.status = newStatus;
        detailedBatch.currentLocation = location;
        
        batchHistory[batchId].push(StatusLog(newStatus, location, block.timestamp));
        emit StatusUpdated(batchId, newStatus, location, msg.sender);
    }

    // Public function to get current batch details (non-sensitive information only)
    function getCurrentBatch(uint256 batchId) public view returns (PublicBatch memory) {
        return batches[batchId];
    }

    // Restricted function to get full batch details (includes sensitive addresses)
    function getFullBatchDetails(uint256 batchId) public view returns (BatchDetails memory) {
        require(
            msg.sender == batchDetails[batchId].producer || 
            msg.sender == batchDetails[batchId].importer || 
            msg.sender == batchDetails[batchId].retailer, 
            "Access restricted to authorized addresses"
        );
        return batchDetails[batchId];
    }

    // Restricted function to get the full history of a batch's status updates
    function getBatchHistory(uint256 batchId) public view returns (StatusLog[] memory) {
        require(
            msg.sender == batchDetails[batchId].producer || 
            msg.sender == batchDetails[batchId].importer || 
            msg.sender == batchDetails[batchId].retailer, 
            "Access restricted to authorized addresses"
        );
        return batchHistory[batchId];
    }
}
